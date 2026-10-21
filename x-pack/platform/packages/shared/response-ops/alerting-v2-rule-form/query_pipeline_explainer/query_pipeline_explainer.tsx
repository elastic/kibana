/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { NoData, Query, Recovery } from '@kbn/alerting-v2-schemas';
import {
  buildPipelineSteps,
  type PipelineStep,
  type PipelineStepId,
} from './build_pipeline_steps';
import { DEMO_NO_DATA, DEMO_QUERY, DEMO_RECOVERY } from './demo_queries';
import { HighlightedEsqlBlock } from './highlighted_esql_block';
import { PipelineMap } from './pipeline_map';
import { StepVisual } from './step_visual';

export interface QueryPipelineExplainerProps {
  /** When true, use the static CPU demo rule. */
  demo?: boolean;
  /** Live rule query (create-context). Ignored when `demo` is true. */
  query?: Query;
  recovery?: Recovery;
  noData?: NoData;
  /** Initial accordion open state. Default false. */
  defaultExpanded?: boolean;
  /** Controlled expanded state; when set, overrides internal accordion state. */
  forceExpanded?: boolean;
  /**
   * `stack` — map above detail (create-form accordion).
   * `canvas` — full-height map with detail panel docked inside.
   * `split` — 50/50 map | detail (Get started onboarding).
   */
  layout?: 'stack' | 'canvas' | 'split';
  'data-test-subj'?: string;
}

const NoDataDiagram = () => (
  <EuiPanel hasBorder paddingSize="m" color="subdued" data-test-subj="queryPipelineNoDataDiagram">
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiBadge>
          <FormattedMessage
            id="xpack.alertingV2.queryPipelineExplainer.noDataDiagram.base"
            defaultMessage="Base query"
          />
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type="sortRight" aria-hidden />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          <FormattedMessage
            id="xpack.alertingV2.queryPipelineExplainer.noDataDiagram.presence"
            defaultMessage="Presence check"
          />
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type="sortRight" aria-hidden />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="warning">
          <FormattedMessage
            id="xpack.alertingV2.queryPipelineExplainer.noDataDiagram.behavior"
            defaultMessage="No-data behavior"
          />
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const StepDetail = ({
  active,
  showFullNoDataQuery,
  onToggleFullNoData,
  compact,
  hideVisual,
}: {
  active: PipelineStep;
  showFullNoDataQuery: boolean;
  onToggleFullNoData: () => void;
  compact?: boolean;
  /** When true, omit StepVisual (e.g. rendered under the map in split layout). */
  hideVisual?: boolean;
}) => {
  const showDiagram = active.id === 'noData' && active.preferDiagram && !showFullNoDataQuery;

  return (
    <>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="flexStart"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4 data-test-subj="queryPipelineActiveTitle">{active.title}</h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p data-test-subj="queryPipelineActiveWhen">{active.when}</p>
      </EuiText>
      {active.hint ? (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <p data-test-subj="queryPipelineActiveHint">{active.hint}</p>
          </EuiText>
        </>
      ) : null}
      {!hideVisual ? (
        <>
          <EuiSpacer size={compact ? 's' : 'm'} />
          <StepVisual stepId={active.id} label={active.visualLabel} />
        </>
      ) : null}
      <EuiSpacer size={compact ? 's' : 'm'} />
      {showDiagram ? (
        <>
          <NoDataDiagram />
          {active.query ? (
            <>
              <EuiSpacer size="s" />
              <EuiButtonEmpty
                size="xs"
                flush="left"
                onClick={onToggleFullNoData}
                data-test-subj="queryPipelineViewFullNoDataQuery"
              >
                <FormattedMessage
                  id="xpack.alertingV2.queryPipelineExplainer.viewFullQuery"
                  defaultMessage="View full query"
                />
              </EuiButtonEmpty>
            </>
          ) : null}
        </>
      ) : active.query ? (
        <HighlightedEsqlBlock
          query={active.query}
          highlightSegment={active.highlightSegment}
          maxHeight={compact ? 560 : 400}
        />
      ) : (
        <EuiText size="s" color="subdued">
          <p data-test-subj="queryPipelineActiveEmpty">
            <FormattedMessage
              id="xpack.alertingV2.queryPipelineExplainer.noQuery"
              defaultMessage="No query to show for this step."
            />
          </p>
        </EuiText>
      )}
      {active.id === 'noData' && active.preferDiagram && showFullNoDataQuery ? (
        <>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            size="xs"
            flush="left"
            onClick={onToggleFullNoData}
            data-test-subj="queryPipelineHideFullNoDataQuery"
          >
            <FormattedMessage
              id="xpack.alertingV2.queryPipelineExplainer.hideFullQuery"
              defaultMessage="Hide full query"
            />
          </EuiButtonEmpty>
        </>
      ) : null}
    </>
  );
};

const ExpandedBody = ({
  steps,
  activeId,
  onSelect,
  showFullNoDataQuery,
  onToggleFullNoData,
  layout,
}: {
  steps: PipelineStep[];
  activeId: PipelineStepId;
  onSelect: (id: PipelineStepId) => void;
  showFullNoDataQuery: boolean;
  onToggleFullNoData: () => void;
  layout: 'stack' | 'canvas' | 'split';
}) => {
  const active = steps.find((s) => s.id === activeId) ?? steps[0];
  const detail = (
    <StepDetail
      active={active}
      showFullNoDataQuery={showFullNoDataQuery}
      onToggleFullNoData={onToggleFullNoData}
      compact={layout === 'canvas' || layout === 'split'}
    />
  );

  const footer = (
    <EuiText size="xs" color="subdued">
      <p data-test-subj="queryPipelineClassicFooter">
        <FormattedMessage
          id="xpack.alertingV2.queryPipelineExplainer.classicFooter"
          defaultMessage="Universal exposes this query pipeline. Classic rule types keep detection logic inside the rule type."
        />
      </p>
    </EuiText>
  );

  if (layout === 'canvas') {
    return (
      <div
        css={css`
          display: flex;
          flex-direction: column;
          flex: 1 1 auto;
          min-block-size: 0;
          block-size: 100%;
        `}
      >
        <PipelineMap
          steps={steps}
          activeId={activeId}
          onSelect={onSelect}
          detail={detail}
          fullHeight
        />
        <EuiSpacer size="m" />
        {footer}
      </div>
    );
  }

  if (layout === 'split') {
    return (
      <div
        css={css`
          display: flex;
          flex-direction: row;
          gap: 24px;
          align-items: flex-start;
        `}
        data-test-subj="queryPipelineSplitLayout"
      >
        <div
          css={css`
            flex: 1 1 50%;
            min-inline-size: 0;
          `}
        >
          <PipelineMap steps={steps} activeId={activeId} onSelect={onSelect} />
        </div>
        <div
          css={css`
            flex: 1 1 50%;
            min-inline-size: 0;
          `}
        >
          {detail}
        </div>
      </div>
    );
  }

  return (
    <>
      <PipelineMap steps={steps} activeId={activeId} onSelect={onSelect} />

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="l" alignItems="flexStart">
        <EuiFlexItem grow={7}>{detail}</EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      {footer}
    </>
  );
};

/**
 * Progressive-disclosure explainer for Universal Alert / Recovery / No-data queries.
 * Use `demo` on Get started; pass live `query` / `recovery` / `no_data` in create-context.
 */
export const QueryPipelineExplainer = ({
  demo = false,
  query: liveQuery,
  recovery: liveRecovery,
  noData: liveNoData,
  defaultExpanded = false,
  forceExpanded,
  layout = 'stack',
  'data-test-subj': dataTestSubj = 'queryPipelineExplainer',
}: QueryPipelineExplainerProps): React.ReactElement => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeId, setActiveId] = useState<PipelineStepId>('alert');
  const [showFullNoDataQuery, setShowFullNoDataQuery] = useState(false);

  const expanded = forceExpanded ?? isExpanded;

  const steps = useMemo(
    () =>
      buildPipelineSteps(
        demo ? DEMO_QUERY : liveQuery,
        demo ? DEMO_RECOVERY : liveRecovery,
        demo ? DEMO_NO_DATA : liveNoData
      ),
    [demo, liveQuery, liveRecovery, liveNoData]
  );

  const teaser = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          <FormattedMessage
            id="xpack.alertingV2.queryPipelineExplainer.chip.alert"
            defaultMessage="Alert"
          />
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          <FormattedMessage
            id="xpack.alertingV2.queryPipelineExplainer.chip.recovery"
            defaultMessage="Recovery"
          />
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          <FormattedMessage
            id="xpack.alertingV2.queryPipelineExplainer.chip.noData"
            defaultMessage="No data"
          />
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          <span>
            <FormattedMessage
              id="xpack.alertingV2.queryPipelineExplainer.teaser"
              defaultMessage="Universal runs more than the query in the editor."
            />
          </span>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const body = (
    <ExpandedBody
      steps={steps}
      activeId={activeId}
      onSelect={setActiveId}
      showFullNoDataQuery={showFullNoDataQuery}
      onToggleFullNoData={() => setShowFullNoDataQuery((v) => !v)}
      layout={layout}
    />
  );

  if (forceExpanded === true) {
    return (
      <div
        data-test-subj={dataTestSubj}
        css={
          layout === 'canvas' || layout === 'split'
            ? css`
                display: flex;
                flex-direction: column;
                flex: 1 1 auto;
                min-block-size: 0;
                block-size: 100%;
              `
            : undefined
        }
      >
        {body}
      </div>
    );
  }

  return (
    <EuiAccordion
      id="query-pipeline-explainer"
      data-test-subj={dataTestSubj}
      buttonContent={
        <div>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.alertingV2.queryPipelineExplainer.sectionTitle', {
                defaultMessage: 'How a rule runs queries',
              })}
            </h3>
          </EuiTitle>
          {!expanded ? (
            <>
              <EuiSpacer size="xs" />
              {teaser}
            </>
          ) : null}
        </div>
      }
      initialIsOpen={defaultExpanded}
      onToggle={(isOpen) => {
        setIsExpanded(isOpen);
        if (!isOpen) {
          setShowFullNoDataQuery(false);
        }
      }}
      paddingSize="m"
    >
      {body}
    </EuiAccordion>
  );
};
