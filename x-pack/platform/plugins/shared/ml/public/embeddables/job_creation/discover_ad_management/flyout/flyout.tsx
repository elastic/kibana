/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC, ReactNode } from 'react';
import type { IconType } from '@elastic/eui';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { JobSuggestion } from '../../../../../common/types/job_suggestions';
import { QuickSuggestedJobCreator } from '../../../../application/jobs/new_job/job_from_suggestion';
import { useMlApi, useMlKibana } from '../../../../application/contexts/kibana';
import { useJobsApiService } from '../../../../application/services/ml_api_service/jobs';
import {
  DEFAULT_SUGGESTION_TIME_RANGE,
  JobSuggestionService,
} from '../../../../application/components/job_suggestion/job_suggestion_service';
import type { SuggestionTimeRange } from '../../../../application/components/job_suggestion/job_suggestion_service';
import { describeTimeRange } from '../../../../application/components/job_suggestion/describe_time_range';
import { useSuggestionHistory } from '../../../../application/components/job_suggestion/use_suggestion_history';
import { SuggestionBadges } from '../../../../application/components/job_suggestion/suggestion_badges';
import { SuggestionStatus } from '../../../../application/components/job_suggestion/suggestion_status';
import { CurrentJobs } from './current_jobs';
import { filterJobsByIndex } from '../../../../application/components/job_suggestion/filter_jobs_by_index';
import { SelectedJob } from './selected_job';
import { JobConfigStep } from './job_config_step';
import { SlidingPanels } from './sliding_panels';

const suggestSectionTitle = i18n.translate(
  'xpack.ml.discoverADManagementFlyout.suggestSectionTitle',
  { defaultMessage: 'Suggest anomaly detection jobs' }
);
const currentSectionTitle = i18n.translate(
  'xpack.ml.discoverADManagementFlyout.currentSectionTitle',
  { defaultMessage: 'Select job' }
);
const managementTitle = i18n.translate('xpack.ml.discoverADManagementFlyout.managementTitle', {
  defaultMessage: 'Anomaly detection management',
});
const TEST_SUBJ_PREFIX = 'mlDiscoverADManagement';

interface Props {
  onClose: () => void;
  indexPattern: string;
}

interface ListedSuggestion {
  /** Tells apart suggestions of the latest run and of the previous run, which can share ids. */
  panelId: string;
  suggestion: JobSuggestion;
}

const toListed = (source: string, suggestions: JobSuggestion[]): ListedSuggestion[] =>
  suggestions.map((suggestion) => ({
    panelId: `${source}-${suggestion.id}`,
    suggestion,
  }));

export const DiscoverADManagementFlyout: FC<Props> = ({ onClose, indexPattern }) => {
  const {
    services: {
      data: {
        dataViews,
        query: {
          timefilter: { timefilter },
        },
      },
      share,
      uiSettings,
      cps,
    },
  } = useMlKibana();
  const mlApi = useMlApi();
  const jobsApi = useJobsApiService();
  const [timeRange, setTimeRange] = useState<SuggestionTimeRange>(DEFAULT_SUGGESTION_TIME_RANGE);
  // Choosing a suggestion slides to a panel of its own, where the job is configured.
  const [selected, setSelected] = useState<ListedSuggestion>();
  // The suggestions are a section of their own, which the flyout slides to.
  const [section, setSection] = useState<'suggest' | 'current'>();
  const isSuggesting = section === 'suggest';

  // The jobs to select from are only offered when there are some for the index. When that can't be
  // told, they are offered so that the section can say what went wrong.
  const [hasJobsToSelect, setHasJobsToSelect] = useState<boolean>();
  useEffect(() => {
    let isCurrent = true;
    mlApi.jobs
      .jobsSummary([])
      .then(
        (jobs) => isCurrent && setHasJobsToSelect(filterJobsByIndex(jobs, indexPattern).length > 0)
      )
      .catch(() => isCurrent && setHasJobsToSelect(true));
    return () => {
      isCurrent = false;
    };
  }, [mlApi, indexPattern]);

  const jobSuggestionService = useMemo(
    () => new JobSuggestionService(jobsApi, timefilter),
    [jobsApi, timefilter]
  );
  const creator = useMemo(
    () => new QuickSuggestedJobCreator(dataViews, uiSettings, timefilter, share, mlApi, cps),
    [dataViews, uiSettings, timefilter, share, mlApi, cps]
  );
  const state = useObservable(jobSuggestionService.state$, jobSuggestionService.state);

  const [hasRequested, setHasRequested] = useState(false);
  const runAnalysis = (range: SuggestionTimeRange) => {
    setHasRequested(true);
    void jobSuggestionService.suggest(indexPattern, range);
  };

  // Analyzes the time range of the page, which is the chart's in Discover
  const useCurrentTimeRange = () => {
    const { from, to } = timefilter.getTime();
    const range = { from, to };
    setTimeRange(range);
    runAnalysis(range);
  };

  useEffect(() => {
    // Leaving the suggestions, or closing the flyout, stops the analysis which is in progress.
    if (isSuggesting) return;
    jobSuggestionService.cancel();
  }, [jobSuggestionService, isSuggesting]);
  useEffect(() => () => jobSuggestionService.cancel(), [jobSuggestionService]);

  const {
    previousRun,
    isLoaded: isHistoryLoaded,
    clearPreviousRun,
  } = useSuggestionHistory(indexPattern, state);

  // The first time the suggestions are opened, they are analyzed when there is nothing from before to show.
  // Clearing the previous results afterwards doesn't start an analysis.
  const hasCheckedHistory = useRef(false);
  useEffect(() => {
    if (!isSuggesting || !isHistoryLoaded || hasCheckedHistory.current) return;
    hasCheckedHistory.current = true;
    if (!previousRun) {
      setHasRequested(true);
      void jobSuggestionService.suggest(indexPattern, timeRange);
    }
  }, [isSuggesting, isHistoryLoaded, previousRun, jobSuggestionService, indexPattern, timeRange]);

  const latest = useMemo(
    () => (state.status === 'loaded' ? toListed('latest', state.suggestions) : []),
    [state]
  );
  const previous = useMemo(
    () => (previousRun ? toListed('previous', previousRun.suggestions) : []),
    [previousRun]
  );

  const renderItem = ({ panelId, suggestion }: ListedSuggestion) => (
    <EuiPanel
      key={panelId}
      hasShadow={false}
      hasBorder
      paddingSize="m"
      onClick={() => setSelected({ panelId, suggestion })}
      data-test-subj={`${TEST_SUBJ_PREFIX}Card-${suggestion.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{suggestion.title}</strong>
          </EuiText>
          <EuiText size="s" color="subdued">
            {suggestion.description}
          </EuiText>
          <EuiSpacer size="s" />
          <SuggestionBadges suggestion={suggestion} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="chevronSingleRight" aria-hidden={true} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  const list = (
    <>
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.ml.discoverADManagementFlyout.subtitle"
          defaultMessage="Jobs which suit the data in {indexPattern}. Select one to create and start it."
          values={{ indexPattern: <strong>{indexPattern}</strong> }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiSuperDatePicker
        compressed
        start={timeRange.from}
        end={timeRange.to}
        onTimeChange={({ start, end }) => {
          const range = { from: start, to: end };
          setTimeRange(range);
          runAnalysis(range);
        }}
        onRefresh={() => runAnalysis(timeRange)}
        isDisabled={hasRequested && state.status === 'loading'}
        data-test-subj="mlDiscoverADManagementAnalysisTimeRange"
      />
      <EuiSpacer size="m" />
      {hasRequested && (
        <>
          <SuggestionStatus
            state={state}
            onStop={() => jobSuggestionService.cancel()}
            onUseCurrentTimeRange={useCurrentTimeRange}
            testSubjPrefix={TEST_SUBJ_PREFIX}
          />
          {latest.map((item) => (
            <React.Fragment key={item.panelId}>
              {renderItem(item)}
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
        </>
      )}
      {previousRun && previous.length > 0 && (
        <div data-test-subj={`${TEST_SUBJ_PREFIX}Previous`}>
          <EuiHorizontalRule margin="s" />
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>
                  <FormattedMessage
                    id="xpack.ml.suggestADJobsFlyout.previousResultsTitle"
                    defaultMessage="Previous results"
                  />
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                onClick={clearPreviousRun}
                data-test-subj={`${TEST_SUBJ_PREFIX}ClearPrevious`}
              >
                <FormattedMessage
                  id="xpack.ml.discoverADManagementFlyout.clearPreviousResultsButton"
                  defaultMessage="Clear"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.ml.suggestADJobsFlyout.previousResultsDescription"
              defaultMessage="{timeRange}, run {ranAt}"
              values={{
                timeRange: describeTimeRange(previousRun.timeRange),
                ranAt: moment(previousRun.ranAt).fromNow(),
              }}
            />
          </EuiText>
          <EuiSpacer size="s" />
          {previous.map((item) => (
            <React.Fragment key={item.panelId}>
              {renderItem(item)}
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
        </div>
      )}
    </>
  );

  const detail = useMemo(
    () =>
      selected && {
        title: selected.suggestion.title,
        content: (
          <JobConfigStep
            suggestion={selected.suggestion}
            indexPattern={indexPattern}
            creator={creator}
            onClose={onClose}
          />
        ),
      },
    [selected, indexPattern, creator, onClose]
  );

  const suggestSection = (
    <SlidingPanels
      list={list}
      detail={detail}
      onBack={() => setSelected(undefined)}
      hideBack
      data-test-subj="mlDiscoverADManagementSuggestions"
    />
  );

  const renderSectionCard = (
    target: 'suggest' | 'current',
    title: string,
    description: ReactNode,
    titleIcon?: IconType
  ) => (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="m"
      onClick={() => setSection(target)}
      data-test-subj={`${TEST_SUBJ_PREFIX}${
        target === 'suggest' ? 'SuggestSection' : 'CurrentSection'
      }`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            {titleIcon && (
              <EuiFlexItem grow={false}>
                <EuiIcon type={titleIcon} color="primary" aria-hidden={true} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{title}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiText size="s" color="subdued">
            {description}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="chevronSingleRight" aria-hidden={true} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  const home = (
    <>
      <SelectedJob indexPattern={indexPattern} />
      {hasJobsToSelect ? (
        <>
          {renderSectionCard(
            'current',
            currentSectionTitle,
            <FormattedMessage
              id="xpack.ml.discoverADManagementFlyout.currentSectionDescription"
              defaultMessage="Jobs which match {indexPattern}"
              values={{ indexPattern: <strong>{indexPattern}</strong> }}
            />
          )}
          <EuiSpacer size="s" />
        </>
      ) : null}
      {renderSectionCard(
        'suggest',
        suggestSectionTitle,
        <FormattedMessage
          id="xpack.ml.discoverADManagementFlyout.suggestSectionDescription"
          defaultMessage="Find jobs which suit the data in {indexPattern}, and create and start them."
          values={{ indexPattern: <strong>{indexPattern}</strong> }}
        />,
        'sparkles'
      )}
    </>
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder data-test-subj="mlDiscoverADManagementFlyout">
        <EuiTitle size="m">
          <h2 id="ml-flyout-layer-title">
            <FormattedMessage
              id="xpack.ml.discoverADManagementFlyout.title"
              defaultMessage="Anomaly detection"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <SlidingPanels
          list={home}
          detail={
            section
              ? {
                  // The back button is labelled with where it goes back to.
                  title: selected ? suggestSectionTitle : managementTitle,
                  content:
                    section === 'suggest' ? (
                      suggestSection
                    ) : (
                      <CurrentJobs indexPattern={indexPattern} />
                    ),
                }
              : undefined
          }
          // Back leaves a job being configured first, then the suggestions.
          onBack={() => (selected ? setSelected(undefined) : setSection(undefined))}
          data-test-subj="mlDiscoverADManagementMenu"
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="mlDiscoverADManagementClose">
          <FormattedMessage
            id="xpack.ml.discoverADManagementFlyout.closeButton"
            defaultMessage="Close"
          />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </>
  );
};
