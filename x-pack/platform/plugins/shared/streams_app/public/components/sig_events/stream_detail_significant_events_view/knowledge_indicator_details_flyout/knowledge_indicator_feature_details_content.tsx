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
import { SparkPlot } from '../../../spark_plot';
import { getConfidenceColor } from '../utils/get_confidence_color';
import {
  getKIDependencies,
  findKIByIdentifier,
  DEPENDENCY_FEATURE_TYPE,
  type KIDependencyRelation,
} from '../utils/get_ki_dependencies';
import { getRelatedQueryKIs } from '../utils/get_related_query_kis';

const EMPTY_ANNOTATIONS: never[] = [];

interface Props {
  feature: Feature;
  /** Full KI list — required to resolve dependency relationships and related events. */
  allKnowledgeIndicators?: KnowledgeIndicator[];
  /** Occurrence timeseries keyed by query id — used to render event sparklines. */
  occurrencesByQueryId?: Record<string, Array<{ x: number; y: number }>>;
  /** Called when the user clicks a dependency KI or related query to navigate to it. */
  onNavigateTo?: (ki: KnowledgeIndicator) => void;
}

export function KnowledgeIndicatorFeatureDetailsContent({
  feature,
  allKnowledgeIndicators,
  occurrencesByQueryId,
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

  const dependencyRows = useMemo(() => {
    const rows: Array<{ direction: string; relation: KIDependencyRelation }> = [];
    for (const relation of dependsOn) {
      rows.push({ direction: DEPENDS_ON_LABEL, relation });
    }
    for (const relation of dependents) {
      rows.push({ direction: DEPENDED_ON_BY_LABEL, relation });
    }
    return rows;
  }, [dependsOn, dependents]);

  const relatedQueryKIs = useMemo(() => {
    if (!allKnowledgeIndicators) return [];
    const thisKI: KnowledgeIndicator = { kind: 'feature', feature };
    return getRelatedQueryKIs(thisKI, allKnowledgeIndicators);
  }, [feature, allKnowledgeIndicators]);

  const eventsColumns: Array<EuiBasicTableColumn<KnowledgeIndicator>> = useMemo(
    () => [
      {
        field: 'query',
        name: EVENTS_QUERY_TITLE_LABEL,
        render: (_: unknown, ki: KnowledgeIndicator) => {
          if (ki.kind !== 'query') return null;
          const label = ki.query.title ?? ki.query.id;
          return onNavigateTo ? (
            <EuiLink onClick={() => onNavigateTo(ki)}>{label}</EuiLink>
          ) : (
            <EuiText size="s">{label}</EuiText>
          );
        },
      },
      {
        field: 'query',
        name: EVENTS_COLUMN_LABEL,
        width: '180px',
        render: (_: unknown, ki: KnowledgeIndicator) => {
          if (ki.kind !== 'query') return null;
          const occurrences = occurrencesByQueryId?.[ki.query.id] ?? [];
          return (
            <SparkPlot
              id={`ki-events-panel-${ki.query.id}`}
              name={OCCURRENCES_TOOLTIP_NAME}
              type="bar"
              timeseries={occurrences}
              annotations={EMPTY_ANNOTATIONS}
              compressed
              hideAxis
              height={32}
            />
          );
        },
      },
    ],
    [onNavigateTo, occurrencesByQueryId]
  );

  const dependencyColumns: Array<
    EuiBasicTableColumn<{ direction: string; relation: KIDependencyRelation }>
  > = useMemo(
    () => [
      {
        field: 'relation',
        name: RELATIONSHIP_COLUMN_LABEL,
        width: '175px',
        render: (relation: KIDependencyRelation, row: { direction: string }) => {
          const via = relation.via;
          const badge = (
            <EuiBadge
              color={row.direction === DEPENDS_ON_LABEL ? 'hollow' : 'default'}
              {...(onNavigateTo
                ? { onClick: () => onNavigateTo(via), onClickAriaLabel: row.direction }
                : {})}
            >
              {row.direction}
            </EuiBadge>
          );
          return onNavigateTo ? (
            <EuiToolTip content={VIEW_DEPENDENCY_TOOLTIP}>{badge}</EuiToolTip>
          ) : (
            badge
          );
        },
      },
      {
        field: 'relation',
        name: KNOWLEDGE_INDICATOR_COLUMN_LABEL,
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
    [onNavigateTo]
  );

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
          <InfoPanel title={DEPENDENCIES_LABEL}>
            {hasDependencies ? (
              <EuiBasicTable
                items={dependencyRows}
                columns={dependencyColumns}
                rowHeader="direction"
                tableCaption={DEPENDENCIES_LABEL}
              />
            ) : (
              <EuiText size="s">{NO_DEPENDENCIES_AVAILABLE}</EuiText>
            )}
          </InfoPanel>
        </EuiFlexItem>
      )}
      {relatedQueryKIs.length > 0 && (
        <EuiFlexItem>
          <InfoPanel title={EVENTS_LABEL}>
            <EuiBasicTable
              items={relatedQueryKIs}
              columns={eventsColumns}
              rowHeader="query"
              tableCaption={EVENTS_LABEL}
            />
          </InfoPanel>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <InfoPanel title={DESCRIPTION_LABEL}>
          <EuiText>{feature.description || NO_DESCRIPTION_AVAILABLE}</EuiText>
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

const DEPENDENCIES_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.dependenciesLabel', {
  defaultMessage: 'Dependencies',
});

const DEPENDS_ON_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.dependsOnLabel', {
  defaultMessage: 'Depends on',
});

const DEPENDED_ON_BY_LABEL = i18n.translate(
  'xpack.streams.featureDetailsFlyout.dependedOnByLabel',
  { defaultMessage: 'Depended on by' }
);

const NO_DEPENDENCIES_AVAILABLE = i18n.translate(
  'xpack.streams.featureDetailsFlyout.noDependenciesAvailable',
  { defaultMessage: 'No dependency relationships found' }
);

const RELATIONSHIP_COLUMN_LABEL = i18n.translate(
  'xpack.streams.featureDetailsFlyout.relationshipColumnLabel',
  { defaultMessage: 'Relationship' }
);

const VIEW_DEPENDENCY_TOOLTIP = i18n.translate(
  'xpack.streams.featureDetailsFlyout.viewDependencyTooltip',
  { defaultMessage: 'View dependency' }
);

const KNOWLEDGE_INDICATOR_COLUMN_LABEL = i18n.translate(
  'xpack.streams.featureDetailsFlyout.knowledgeIndicatorColumnLabel',
  { defaultMessage: 'Knowledge indicator' }
);

const EVENTS_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.eventsLabel', {
  defaultMessage: 'Events',
});

const EVENTS_QUERY_TITLE_LABEL = i18n.translate(
  'xpack.streams.featureDetailsFlyout.eventsQueryTitleLabel',
  { defaultMessage: 'Query' }
);

const EVENTS_COLUMN_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.eventsColumnLabel', {
  defaultMessage: 'Events',
});

const OCCURRENCES_TOOLTIP_NAME = i18n.translate(
  'xpack.streams.featureDetailsFlyout.occurrencesTooltipName',
  { defaultMessage: 'Occurrences' }
);
