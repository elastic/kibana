/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiLink,
  EuiText,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import type { Feature } from '@kbn/streams-schema';
import { upperFirst } from 'lodash';
import React, { useMemo } from 'react';
import { InfoPanel } from '../../../info_panel';
import { getConfidenceColor } from '../utils/get_confidence_color';
import {
  getKIDependencies,
  findKIByIdentifier,
  DEPENDENCY_FEATURE_TYPE,
  type KIDependencyRelation,
} from '../utils/get_ki_dependencies';

interface Props {
  feature: Feature;
  allKnowledgeIndicators?: KnowledgeIndicator[];
  onNavigateTo?: (ki: KnowledgeIndicator) => void;
}

export function KnowledgeIndicatorFeatureDetailsContent({
  feature,
  allKnowledgeIndicators,
  onNavigateTo,
}: Props) {
  const listItems = useMemo(() => {
    const tags = feature.tags?.length ? feature.tags : [];

    return [
      {
        title: DETAILS_ID_LABEL,
        description: (
          <EuiText size="s" data-test-subj="streamsAppFeatureDetailsFlyoutId">
            {feature.id}
          </EuiText>
        ),
      },
      {
        title: DETAILS_TYPE_LABEL,
        description: <EuiBadge color="hollow">{upperFirst(feature.type)}</EuiBadge>,
      },
      {
        title: DETAILS_SUBTYPE_LABEL,
        description: <EuiBadge color="hollow">{feature.subtype ?? EMPTY_VALUE}</EuiBadge>,
      },
      {
        title: DETAILS_PROPERTIES_LABEL,
        description: (
          <EuiText size="s">
            {Object.entries(feature.properties)
              .filter(([, value]) => typeof value === 'string')
              .map(([key, value]) => {
                const strValue = value as string;
                const isRefKey = key === 'source' || key === 'target';
                const referencedKI =
                  isRefKey && allKnowledgeIndicators
                    ? findKIByIdentifier(strValue, allKnowledgeIndicators)
                    : undefined;
                return (
                  <EuiText size="s" key={key}>
                    <strong>{key}</strong>{' '}
                    {referencedKI && onNavigateTo ? (
                      <EuiLink onClick={() => onNavigateTo(referencedKI)}>{strValue}</EuiLink>
                    ) : (
                      strValue
                    )}
                  </EuiText>
                );
              })}
          </EuiText>
        ),
      },
      {
        title: DETAILS_CONFIDENCE_LABEL,
        description: (
          <EuiHealth color={getConfidenceColor(feature.confidence)}>{feature.confidence}</EuiHealth>
        ),
      },
      {
        title: DETAILS_TAGS_LABEL,
        description:
          tags.length > 0 ? (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {tags.map((tag) => (
                <EuiFlexItem key={tag} grow={false}>
                  <EuiBadge color="hollow">{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ) : (
            <EuiText size="s">{EMPTY_VALUE}</EuiText>
          ),
      },
      {
        title: DETAILS_LAST_SEEN_LABEL,
        description: <EuiText size="s">{feature.last_seen || EMPTY_VALUE}</EuiText>,
      },
      {
        title: DETAILS_EXPIRES_AT_LABEL,
        description: <EuiText size="s">{feature.expires_at ?? EMPTY_VALUE}</EuiText>,
      },
    ];
  }, [feature, allKnowledgeIndicators, onNavigateTo]);

  const evidence = feature.evidence?.length ? feature.evidence : [];
  const hasMeta = Object.keys(feature.meta ?? {}).length > 0;

  const { dependsOn, dependents } = useMemo(() => {
    if (!allKnowledgeIndicators || feature.type === DEPENDENCY_FEATURE_TYPE) {
      return { dependsOn: [], dependents: [] };
    }
    const thisKI: KnowledgeIndicator = { kind: 'feature', feature };
    return getKIDependencies(thisKI, allKnowledgeIndicators);
  }, [feature, allKnowledgeIndicators]);

  const hasDependencies = dependsOn.length > 0 || dependents.length > 0;
  const showDependenciesPanel = feature.type !== DEPENDENCY_FEATURE_TYPE;

  const dependsOnLabel = i18n.translate('xpack.streams.featureDetailsFlyout.dependsOnLabel', {
    defaultMessage: 'Depends on',
  });
  const dependedOnByLabel = i18n.translate('xpack.streams.featureDetailsFlyout.dependedOnByLabel', {
    defaultMessage: 'Depended on by',
  });

  const dependencyRows = useMemo(() => {
    const rows: Array<{ direction: string; relation: KIDependencyRelation }> = [];
    for (const relation of dependsOn) {
      rows.push({ direction: dependsOnLabel, relation });
    }
    for (const relation of dependents) {
      rows.push({ direction: dependedOnByLabel, relation });
    }
    return rows;
  }, [dependsOn, dependents, dependsOnLabel, dependedOnByLabel]);

  const dependencyColumns: Array<
    EuiBasicTableColumn<{ direction: string; relation: KIDependencyRelation }>
  > = useMemo(
    () => [
      {
        field: 'relation',
        name: i18n.translate('xpack.streams.featureDetailsFlyout.relationshipColumnLabel', {
          defaultMessage: 'Relationship',
        }),
        width: '175px',
        render: (relation: KIDependencyRelation, row: { direction: string }) => {
          const via = relation.via;
          const badge = (
            <EuiBadge color={row.direction === dependsOnLabel ? 'hollow' : 'default'}>
              {row.direction}
            </EuiBadge>
          );
          if (onNavigateTo) {
            return (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.streams.featureDetailsFlyout.viewDependencyTooltip',
                  { defaultMessage: 'View dependency' }
                )}
              >
                <EuiLink onClick={() => onNavigateTo(via)}>{badge}</EuiLink>
              </EuiToolTip>
            );
          }
          return badge;
        },
      },
      {
        field: 'relation',
        name: i18n.translate('xpack.streams.featureDetailsFlyout.knowledgeIndicatorColumnLabel', {
          defaultMessage: 'Knowledge indicator',
        }),
        render: (relation: KIDependencyRelation) => {
          const ki = relation.ki;
          const label =
            ki.kind === 'feature'
              ? ki.feature.title ?? ki.feature.id
              : ki.query.title ?? ki.query.id;
          return onNavigateTo ? (
            <EuiLink onClick={() => onNavigateTo(ki)}>{label}</EuiLink>
          ) : (
            <EuiText>{label}</EuiText>
          );
        },
      },
    ],
    [onNavigateTo, dependsOnLabel]
  );

  const dependenciesLabel = i18n.translate('xpack.streams.featureDetailsFlyout.dependenciesLabel', {
    defaultMessage: 'Dependencies',
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <InfoPanel title={GENERAL_INFORMATION_LABEL}>
          {listItems.map((item, index) => (
            <React.Fragment key={item.title}>
              <EuiDescriptionList
                type="column"
                columnWidths={[1, 2]}
                compressed
                listItems={[item]}
              />
              {index < listItems.length - 1 && <EuiHorizontalRule margin="m" />}
            </React.Fragment>
          ))}
        </InfoPanel>
      </EuiFlexItem>
      {showDependenciesPanel && (hasDependencies || allKnowledgeIndicators) && (
        <EuiFlexItem>
          <InfoPanel title={dependenciesLabel}>
            {hasDependencies ? (
              <EuiBasicTable
                items={dependencyRows}
                columns={dependencyColumns}
                rowHeader="direction"
                tableCaption={dependenciesLabel}
              />
            ) : (
              <EuiText size="s">
                {i18n.translate('xpack.streams.featureDetailsFlyout.noDependenciesAvailable', {
                  defaultMessage: 'No dependency relationships found',
                })}
              </EuiText>
            )}
          </InfoPanel>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <InfoPanel title={DESCRIPTION_LABEL}>
          <EuiText size="s">{feature.description || NO_DESCRIPTION_AVAILABLE}</EuiText>
        </InfoPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <InfoPanel title={EVIDENCE_LABEL}>
          {evidence.length > 0 ? (
            evidence.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiHealth color="subdued" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">{item}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                {index < evidence.length - 1 && <EuiHorizontalRule margin="m" />}
              </React.Fragment>
            ))
          ) : (
            <EuiText size="s">{NO_EVIDENCE_AVAILABLE}</EuiText>
          )}
        </InfoPanel>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj="streamsAppFeatureDetailsFlyoutMeta">
        <InfoPanel title={META_LABEL}>
          {hasMeta ? (
            <EuiCodeBlock language="json" paddingSize="s" fontSize="s" isCopyable>
              {JSON.stringify(feature.meta ?? {}, null, 2)}
            </EuiCodeBlock>
          ) : (
            <EuiText size="s">{NO_META_AVAILABLE}</EuiText>
          )}
        </InfoPanel>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj="streamsAppFeatureDetailsFlyoutRawDocument">
        <InfoPanel title={RAW_DOCUMENT_LABEL}>
          <EuiCodeBlock language="json" paddingSize="s" fontSize="s" isCopyable>
            {JSON.stringify(feature, null, 2)}
          </EuiCodeBlock>
        </InfoPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const GENERAL_INFORMATION_LABEL = i18n.translate(
  'xpack.streams.featureDetailsFlyout.generalInformationLabel',
  {
    defaultMessage: 'General information',
  }
);

const DETAILS_TYPE_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.typeLabel', {
  defaultMessage: 'Type',
});

const DETAILS_ID_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.idLabel', {
  defaultMessage: 'ID',
});

const DETAILS_SUBTYPE_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.subtypeLabel', {
  defaultMessage: 'Subtype',
});

const DETAILS_PROPERTIES_LABEL = i18n.translate(
  'xpack.streams.featureDetailsFlyout.propertiesLabel',
  {
    defaultMessage: 'Properties',
  }
);

const DETAILS_CONFIDENCE_LABEL = i18n.translate(
  'xpack.streams.featureDetailsFlyout.confidenceLabel',
  {
    defaultMessage: 'Confidence',
  }
);

const DETAILS_TAGS_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.tagsLabel', {
  defaultMessage: 'Tags',
});

const DETAILS_LAST_SEEN_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.lastSeenLabel', {
  defaultMessage: 'Last seen',
});

const DETAILS_EXPIRES_AT_LABEL = i18n.translate(
  'xpack.streams.featureDetailsFlyout.expiresAtLabel',
  {
    defaultMessage: 'Expires at',
  }
);

const DESCRIPTION_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.descriptionLabel', {
  defaultMessage: 'Description',
});

const NO_DESCRIPTION_AVAILABLE = i18n.translate(
  'xpack.streams.featureDetailsFlyout.noDescriptionAvailable',
  {
    defaultMessage: 'No description available',
  }
);

const EVIDENCE_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.evidenceLabel', {
  defaultMessage: 'Evidence',
});

const NO_EVIDENCE_AVAILABLE = i18n.translate(
  'xpack.streams.featureDetailsFlyout.noEvidenceAvailable',
  {
    defaultMessage: 'No evidence available',
  }
);

const META_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.metaLabel', {
  defaultMessage: 'Meta',
});

const NO_META_AVAILABLE = i18n.translate('xpack.streams.featureDetailsFlyout.noMetaAvailable', {
  defaultMessage: 'No meta information',
});

const RAW_DOCUMENT_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.rawDocumentLabel', {
  defaultMessage: 'Raw document',
});

const EMPTY_VALUE = i18n.translate('xpack.streams.featureDetailsFlyout.emptyValue', {
  defaultMessage: '-',
});
