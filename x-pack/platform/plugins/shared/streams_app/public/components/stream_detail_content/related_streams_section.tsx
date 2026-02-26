/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Relationship, RelationshipDirection } from '@kbn/streams-schema';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useTimeRange } from '../../hooks/use_time_range';
import { useKibana } from '../../hooks/use_kibana';

interface SharedField {
  name: string;
  type: string;
  otherType: string;
  isCorrelationField: boolean;
  correlationWeight: number;
  metadata?: {
    description?: string;
    flat_name?: string;
    name?: string;
    type?: string;
  };
}

interface RelationshipSuggestion {
  from_stream: string;
  to_stream: string;
  confidence: number;
  shared_fields: SharedField[];
  description: string;
}

interface RelatedStreamsSectionProps {
  relationships: Relationship[];
  loading: boolean;
  streamName: string;
  canManage: boolean;
  onUnlink: (targetStream: string) => Promise<void>;
  onLink: (relationship: Relationship) => Promise<void>;
  onRefresh: () => void;
}

export function RelatedStreamsSection({
  relationships,
  loading,
  streamName,
  canManage,
  onUnlink,
  onLink,
  onRefresh,
}: RelatedStreamsSectionProps) {
  const router = useStreamsAppRouter();
  const { euiTheme } = useEuiTheme();
  const { rangeFrom, rangeTo } = useTimeRange();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    core: { notifications },
  } = useKibana();

  const [isAddFlyoutOpen, setIsAddFlyoutOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState<EuiComboBoxOptionOption[]>([]);
  const [direction, setDirection] = useState<RelationshipDirection>('bidirectional');
  const [description, setDescription] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [availableStreams, setAvailableStreams] = useState<EuiComboBoxOptionOption[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);
  const [suggestions, setSuggestions] = useState<RelationshipSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const loadRelationshipSuggestions = useCallback(async () => {
    setIsLoadingSuggestions(true);
    try {
      const result = await streamsRepositoryClient.fetch(
        'GET /internal/streams/{name}/relationships/_suggestions',
        {
          signal: null,
          params: {
            path: {
              name: streamName,
            },
            query: {
              min_confidence: 0.1,
              max_suggestions: 10,
            },
          },
        }
      );
      setSuggestions(result.suggestions);
    } catch (error) {
      // Silently handle error - suggestions are optional
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [streamsRepositoryClient, streamName]);

  const loadAvailableStreams = useCallback(async () => {
    setIsLoadingStreams(true);
    try {
      const result = await streamsRepositoryClient.fetch('GET /internal/streams', {
        signal: null,
      });
      const existingRelatedStreams = new Set(
        relationships.flatMap((r) => [r.from_stream, r.to_stream])
      );
      const options = result.streams
        .filter(
          (s) =>
            s.stream.name !== streamName && !existingRelatedStreams.has(s.stream.name)
        )
        // Filter out parent/child relationships
        .filter(
          (s) =>
            !s.stream.name.startsWith(streamName + '.') &&
            !streamName.startsWith(s.stream.name + '.')
        )
        .map((s) => ({ label: s.stream.name, value: s.stream.name }));
      setAvailableStreams(options);
    } catch (error) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.streams.content.relatedStreams.loadStreamsError', {
          defaultMessage: 'Failed to load streams',
        }),
      });
    } finally {
      setIsLoadingStreams(false);
    }
  }, [streamsRepositoryClient, streamName, relationships, notifications]);

  const handleOpenAddFlyout = useCallback(() => {
    setIsAddFlyoutOpen(true);
    setSelectedStream([]);
    setDirection('bidirectional');
    setDescription('');
    setSuggestions([]);
    loadAvailableStreams();
    loadRelationshipSuggestions();
  }, [loadAvailableStreams, loadRelationshipSuggestions]);

  const handleCloseAddFlyout = useCallback(() => {
    setIsAddFlyoutOpen(false);
  }, []);

  const handleSelectSuggestion = useCallback((suggestion: RelationshipSuggestion) => {
    setSelectedStream([{ label: suggestion.to_stream, value: suggestion.to_stream }]);
    setDescription(suggestion.description);
    setDirection('bidirectional');
  }, []);

  const handleAddRelationship = useCallback(async () => {
    if (selectedStream.length === 0) return;

    setIsLinking(true);
    try {
      const relationship: Relationship = {
        from_stream: streamName,
        to_stream: selectedStream[0].value as string,
        direction,
        source: 'manual',
        description: description || '',
      };
      await onLink(relationship);
      handleCloseAddFlyout();
    } finally {
      setIsLinking(false);
    }
  }, [selectedStream, streamName, direction, description, onLink, handleCloseAddFlyout]);

  const columns: Array<EuiBasicTableColumn<Relationship>> = [
    {
      field: 'to_stream',
      name: i18n.translate('xpack.streams.content.relatedStreams.streamColumn', {
        defaultMessage: 'Stream',
      }),
      render: (toStream: string, relationship: Relationship) => {
        const relatedStream =
          relationship.from_stream === streamName
            ? relationship.to_stream
            : relationship.from_stream;

        return (
          <EuiLink
            href={router.link('/{key}/management/{tab}', {
              path: { key: relatedStream, tab: 'retention' },
              query: { rangeFrom, rangeTo },
            })}
          >
            {relatedStream}
          </EuiLink>
        );
      },
    },
    {
      field: 'direction',
      name: i18n.translate('xpack.streams.content.relatedStreams.directionColumn', {
        defaultMessage: 'Direction',
      }),
      width: '120px',
      render: (direction: string) => (
        <EuiBadge color={direction === 'bidirectional' ? 'primary' : 'hollow'}>
          {direction === 'bidirectional' ? BIDIRECTIONAL_LABEL : DIRECTIONAL_LABEL}
        </EuiBadge>
      ),
    },
    {
      field: 'source',
      name: i18n.translate('xpack.streams.content.relatedStreams.sourceColumn', {
        defaultMessage: 'Source',
      }),
      width: '130px',
      render: (source: string, relationship: Relationship) => (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color={source === 'auto_detected' ? 'success' : 'hollow'}>
              {source === 'auto_detected' ? AUTO_DETECTED_LABEL : MANUAL_LABEL}
            </EuiBadge>
          </EuiFlexItem>
          {relationship.confidence !== undefined && (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={CONFIDENCE_TOOLTIP}>
                <EuiText size="xs" color="subdued">
                  {Math.round(relationship.confidence * 100)}%
                </EuiText>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'description',
      name: i18n.translate('xpack.streams.content.relatedStreams.descriptionColumn', {
        defaultMessage: 'Description',
      }),
      truncateText: true,
    },
    {
      name: i18n.translate('xpack.streams.content.relatedStreams.actionsColumn', {
        defaultMessage: 'Actions',
      }),
      width: '80px',
      actions: [
        {
          name: i18n.translate('xpack.streams.content.relatedStreams.unlinkAction', {
            defaultMessage: 'Remove relationship',
          }),
          description: i18n.translate(
            'xpack.streams.content.relatedStreams.unlinkActionDescription',
            {
              defaultMessage: 'Remove this relationship',
            }
          ),
          type: 'icon',
          icon: 'unlink',
          enabled: () => canManage,
          onClick: (relationship) => {
            const relatedStream =
              relationship.from_stream === streamName
                ? relationship.to_stream
                : relationship.from_stream;
            onUnlink(relatedStream);
          },
          'data-test-subj': 'streamsAppRelatedStreamUnlinkAction',
        },
      ],
    },
  ];

  if (loading) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} title={<span />} />
      </EuiPanel>
    );
  }

  if (relationships.length === 0) {
    return (
      <>
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
          <EuiEmptyPrompt
            iconType="link"
            title={<h3>{NO_RELATIONSHIPS_TITLE}</h3>}
            body={<p>{NO_RELATIONSHIPS_DESCRIPTION}</p>}
            actions={
              canManage ? (
                <EuiButton
                  onClick={handleOpenAddFlyout}
                  data-test-subj="streamsAppAddRelationshipButton"
                >
                  {ADD_RELATIONSHIP_BUTTON}
                </EuiButton>
              ) : undefined
            }
          />
        </EuiPanel>
        {isAddFlyoutOpen && (
          <AddRelationshipFlyout
            availableStreams={availableStreams}
            isLoadingStreams={isLoadingStreams}
            selectedStream={selectedStream}
            onSelectedStreamChange={setSelectedStream}
            direction={direction}
            onDirectionChange={setDirection}
            description={description}
            onDescriptionChange={setDescription}
            isLinking={isLinking}
            onClose={handleCloseAddFlyout}
            onAdd={handleAddRelationship}
            suggestions={suggestions}
            isLoadingSuggestions={isLoadingSuggestions}
            onSelectSuggestion={handleSelectSuggestion}
          />
        )}
      </>
    );
  }

  return (
    <>
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          {canManage && (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                onClick={handleOpenAddFlyout}
                data-test-subj="streamsAppAddRelationshipButton"
              >
                {ADD_RELATIONSHIP_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="refresh"
              aria-label={i18n.translate('xpack.streams.content.relatedStreams.refreshButton', {
                defaultMessage: 'Refresh relationships',
              })}
              onClick={onRefresh}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiBasicTable
          css={css`
            & thead tr {
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
            }
          `}
          tableCaption={i18n.translate('xpack.streams.content.relatedStreams.tableCaption', {
            defaultMessage: 'List of related streams',
          })}
          data-test-subj="streamsAppRelatedStreamsTable"
          columns={columns}
          itemId={(item) => `${item.from_stream}-${item.to_stream}`}
          items={relationships}
        />
      </EuiPanel>
      {isAddFlyoutOpen && (
        <AddRelationshipFlyout
          availableStreams={availableStreams}
          isLoadingStreams={isLoadingStreams}
          selectedStream={selectedStream}
          onSelectedStreamChange={setSelectedStream}
          direction={direction}
          onDirectionChange={setDirection}
          description={description}
          onDescriptionChange={setDescription}
          isLinking={isLinking}
          onClose={handleCloseAddFlyout}
          onAdd={handleAddRelationship}
          suggestions={suggestions}
          isLoadingSuggestions={isLoadingSuggestions}
          onSelectSuggestion={handleSelectSuggestion}
        />
      )}
    </>
  );
}

// i18n labels

const BIDIRECTIONAL_LABEL = i18n.translate(
  'xpack.streams.content.relatedStreams.bidirectionalLabel',
  {
    defaultMessage: 'Bidirectional',
  }
);

const DIRECTIONAL_LABEL = i18n.translate('xpack.streams.content.relatedStreams.directionalLabel', {
  defaultMessage: 'Directional',
});

const AUTO_DETECTED_LABEL = i18n.translate(
  'xpack.streams.content.relatedStreams.autoDetectedLabel',
  {
    defaultMessage: 'Auto-detected',
  }
);

const MANUAL_LABEL = i18n.translate('xpack.streams.content.relatedStreams.manualLabel', {
  defaultMessage: 'Manual',
});

const CONFIDENCE_TOOLTIP = i18n.translate(
  'xpack.streams.content.relatedStreams.confidenceTooltip',
  {
    defaultMessage: 'Confidence score for auto-detected relationships',
  }
);

const NO_RELATIONSHIPS_TITLE = i18n.translate(
  'xpack.streams.content.relatedStreams.empty.title',
  {
    defaultMessage: 'No related streams',
  }
);

const NO_RELATIONSHIPS_DESCRIPTION = i18n.translate(
  'xpack.streams.content.relatedStreams.empty.description',
  {
    defaultMessage:
      'Relationships connect streams that share data across different hierarchies, like application logs and proxy logs for the same service.',
  }
);

const ADD_RELATIONSHIP_BUTTON = i18n.translate(
  'xpack.streams.content.relatedStreams.addButton',
  {
    defaultMessage: 'Add relationship',
  }
);

const ADD_RELATIONSHIP_FLYOUT_TITLE = i18n.translate(
  'xpack.streams.content.relatedStreams.addFlyout.title',
  {
    defaultMessage: 'Add stream relationship',
  }
);

const TARGET_STREAM_LABEL = i18n.translate(
  'xpack.streams.content.relatedStreams.addFlyout.targetStreamLabel',
  {
    defaultMessage: 'Target stream',
  }
);

const TARGET_STREAM_PLACEHOLDER = i18n.translate(
  'xpack.streams.content.relatedStreams.addFlyout.targetStreamPlaceholder',
  {
    defaultMessage: 'Select a stream',
  }
);

const DIRECTION_LABEL = i18n.translate(
  'xpack.streams.content.relatedStreams.addFlyout.directionLabel',
  {
    defaultMessage: 'Direction',
  }
);

const DESCRIPTION_LABEL = i18n.translate(
  'xpack.streams.content.relatedStreams.addFlyout.descriptionLabel',
  {
    defaultMessage: 'Description (optional)',
  }
);

const DESCRIPTION_PLACEHOLDER = i18n.translate(
  'xpack.streams.content.relatedStreams.addFlyout.descriptionPlaceholder',
  {
    defaultMessage: 'e.g., Same service, different log types',
  }
);

const CANCEL_BUTTON = i18n.translate(
  'xpack.streams.content.relatedStreams.addFlyout.cancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

const ADD_BUTTON = i18n.translate(
  'xpack.streams.content.relatedStreams.addFlyout.addButton',
  {
    defaultMessage: 'Add',
  }
);

const SUGGESTED_RELATIONSHIPS_TITLE = i18n.translate(
  'xpack.streams.content.relatedStreams.addFlyout.suggestedTitle',
  {
    defaultMessage: 'Suggested relationships',
  }
);

const SUGGESTED_RELATIONSHIPS_DESCRIPTION = i18n.translate(
  'xpack.streams.content.relatedStreams.addFlyout.suggestedDescription',
  {
    defaultMessage:
      'These streams share fields with this stream and may be related. Click to select.',
  }
);

const LOADING_SUGGESTIONS_TEXT = i18n.translate(
  'xpack.streams.content.relatedStreams.addFlyout.loadingSuggestions',
  {
    defaultMessage: 'Loading suggestions...',
  }
);

const MANUAL_SELECTION_TITLE = i18n.translate(
  'xpack.streams.content.relatedStreams.addFlyout.manualSelectionTitle',
  {
    defaultMessage: 'Or select manually',
  }
);

const MORE_FIELDS_TEXT = i18n.translate(
  'xpack.streams.content.relatedStreams.addFlyout.moreFields',
  {
    defaultMessage: 'more',
  }
);

const SELECTED_TEXT = i18n.translate(
  'xpack.streams.content.relatedStreams.addFlyout.selected',
  {
    defaultMessage: 'Selected',
  }
);

// Add Relationship Flyout component

interface AddRelationshipFlyoutProps {
  availableStreams: EuiComboBoxOptionOption[];
  isLoadingStreams: boolean;
  selectedStream: EuiComboBoxOptionOption[];
  onSelectedStreamChange: (selected: EuiComboBoxOptionOption[]) => void;
  direction: RelationshipDirection;
  onDirectionChange: (direction: RelationshipDirection) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  isLinking: boolean;
  onClose: () => void;
  onAdd: () => void;
  suggestions: RelationshipSuggestion[];
  isLoadingSuggestions: boolean;
  onSelectSuggestion: (suggestion: RelationshipSuggestion) => void;
}

function AddRelationshipFlyout({
  availableStreams,
  isLoadingStreams,
  selectedStream,
  onSelectedStreamChange,
  direction,
  onDirectionChange,
  description,
  onDescriptionChange,
  isLinking,
  onClose,
  onAdd,
  suggestions,
  isLoadingSuggestions,
  onSelectSuggestion,
}: AddRelationshipFlyoutProps) {
  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      size="s"
      aria-labelledby="addRelationshipFlyoutTitle"
      data-test-subj="streamsAppAddRelationshipFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="addRelationshipFlyoutTitle">{ADD_RELATIONSHIP_FLYOUT_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* Suggestions section */}
        {(isLoadingSuggestions || suggestions.length > 0) && (
          <>
            <EuiTitle size="xs">
              <h3>{SUGGESTED_RELATIONSHIPS_TITLE}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              {SUGGESTED_RELATIONSHIPS_DESCRIPTION}
            </EuiText>
            <EuiSpacer size="m" />

            {isLoadingSuggestions ? (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="s" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">{LOADING_SUGGESTIONS_TEXT}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiFlexGroup direction="column" gutterSize="s">
                {suggestions.map((suggestion) => (
                  <EuiFlexItem key={suggestion.to_stream}>
                    <SuggestionCard
                      suggestion={suggestion}
                      isSelected={selectedStream[0]?.value === suggestion.to_stream}
                      onSelect={() => onSelectSuggestion(suggestion)}
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            )}

            <EuiHorizontalRule margin="l" />
            <EuiTitle size="xs">
              <h3>{MANUAL_SELECTION_TITLE}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
          </>
        )}

        <EuiFormRow label={TARGET_STREAM_LABEL} fullWidth>
          <EuiComboBox
            placeholder={TARGET_STREAM_PLACEHOLDER}
            singleSelection={{ asPlainText: true }}
            options={availableStreams}
            selectedOptions={selectedStream}
            onChange={onSelectedStreamChange}
            isLoading={isLoadingStreams}
            fullWidth
            data-test-subj="streamsAppAddRelationshipStreamSelect"
          />
        </EuiFormRow>

        <EuiFormRow label={DIRECTION_LABEL} fullWidth>
          <EuiSelect
            options={[
              { value: 'bidirectional', text: BIDIRECTIONAL_LABEL },
              { value: 'directional', text: DIRECTIONAL_LABEL },
            ]}
            value={direction}
            onChange={(e) => onDirectionChange(e.target.value as RelationshipDirection)}
            fullWidth
            data-test-subj="streamsAppAddRelationshipDirectionSelect"
          />
        </EuiFormRow>

        <EuiFormRow label={DESCRIPTION_LABEL} fullWidth>
          <EuiFieldText
            placeholder={DESCRIPTION_PLACEHOLDER}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            fullWidth
            data-test-subj="streamsAppAddRelationshipDescriptionInput"
          />
        </EuiFormRow>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>{CANCEL_BUTTON}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onAdd}
              isLoading={isLinking}
              disabled={selectedStream.length === 0 || isLinking}
              data-test-subj="streamsAppAddRelationshipConfirmButton"
            >
              {ADD_BUTTON}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

// Suggestion Card component for displaying relationship suggestions

interface SuggestionCardProps {
  suggestion: RelationshipSuggestion;
  isSelected: boolean;
  onSelect: () => void;
}

function SuggestionCard({ suggestion, isSelected, onSelect }: SuggestionCardProps) {
  const { euiTheme } = useEuiTheme();
  const confidencePercent = Math.round(suggestion.confidence * 100);

  // Get top correlation fields (max 3)
  const topFields = suggestion.shared_fields
    .filter((f) => f.isCorrelationField)
    .slice(0, 3);

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      css={css`
        cursor: pointer;
        border-color: ${isSelected ? euiTheme.colors.primary : euiTheme.colors.lightShade};
        background-color: ${isSelected ? euiTheme.colors.lightestShade : 'transparent'};
        &:hover {
          border-color: ${euiTheme.colors.primary};
        }
      `}
      onClick={onSelect}
      data-test-subj={`streamsAppRelationshipSuggestion-${suggestion.to_stream}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>{suggestion.to_stream}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={CONFIDENCE_TOOLTIP}>
                    <EuiBadge color={getConfidenceColor(confidencePercent)}>
                      {confidencePercent}%
                    </EuiBadge>
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {suggestion.description && (
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {suggestion.description}
                </EuiText>
              </EuiFlexItem>
            )}
            {topFields.length > 0 && (
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                  {topFields.map((field) => (
                    <EuiFlexItem grow={false} key={field.name}>
                      <EuiToolTip
                        content={
                          field.metadata?.description ||
                          i18n.translate(
                            'xpack.streams.content.relatedStreams.sharedFieldTooltip',
                            {
                              defaultMessage: 'Shared field: {fieldName} ({fieldType})',
                              values: { fieldName: field.name, fieldType: field.type },
                            }
                          )
                        }
                      >
                        <EuiBadge color="hollow">{field.name}</EuiBadge>
                      </EuiToolTip>
                    </EuiFlexItem>
                  ))}
                  {suggestion.shared_fields.length > 3 && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        +{suggestion.shared_fields.length - 3} {MORE_FIELDS_TEXT}
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        {isSelected && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary">{SELECTED_TEXT}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function getConfidenceColor(percent: number): 'success' | 'warning' | 'hollow' {
  if (percent >= 70) return 'success';
  if (percent >= 40) return 'warning';
  return 'hollow';
}
