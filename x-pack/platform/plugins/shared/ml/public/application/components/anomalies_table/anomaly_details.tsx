/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for displaying details of an anomaly in the expanded row section
 * of the anomalies table.
 */

import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  useEuiTheme,
  EuiTitle,
} from '@elastic/eui';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { type MlAnomaliesTableRecordExtended } from '@kbn/ml-anomaly-utils';
import { getAnomalyDescription } from '../../../../common/util/anomaly_description';
import { MAX_CHARS } from './anomalies_table_constants';
import type { CategoryDefinition } from '../../services/ml_api_service/results';
import type { EntityCellFilter } from '../entity_cell';
import type { ExplorerJob } from '../../explorer/explorer_utils';
import {
  AnomalyExplanationDetails,
  DetailsItems,
  getInfluencersItems,
} from './anomaly_details_utils';

interface Props {
  anomaly: MlAnomaliesTableRecordExtended;
  isAggregatedData: boolean;
  influencersLimit: number;
  tabIndex: number;
  job: ExplorerJob;
  definition?: CategoryDefinition;
  examples?: string[];
  categoryDefinitionError?: string;
  filter?: EntityCellFilter;
  influencerFilter?: EntityCellFilter;
}

export const AnomalyDetails: FC<Props> = ({
  anomaly,
  examples,
  definition,
  categoryDefinitionError,
  isAggregatedData,
  filter,
  influencersLimit,
  influencerFilter,
  tabIndex,
  job,
}) => {
  if (examples !== undefined && examples.length > 0) {
    const tabs = [
      {
        id: 'Details',
        name: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.detailsTitle', {
          defaultMessage: 'Details',
        }),
        content: (
          <Contents
            anomaly={anomaly}
            filter={filter}
            influencerFilter={influencerFilter}
            influencersLimit={influencersLimit}
            isAggregatedData={isAggregatedData}
            job={job}
          />
        ),
      },
      {
        id: 'category-examples',
        name: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.categoryExamplesTitle', {
          defaultMessage: 'Category examples',
        }),
        content: (
          <CategoryExamples
            examples={examples}
            definition={definition}
            error={categoryDefinitionError}
          />
        ),
      },
    ];

    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTabbedContent
            tabs={tabs}
            size="s"
            initialSelectedTab={tabs[tabIndex]}
            onTabClick={() => {}}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <Contents
      anomaly={anomaly}
      filter={filter}
      influencerFilter={influencerFilter}
      influencersLimit={influencersLimit}
      isAggregatedData={isAggregatedData}
      job={job}
    />
  );
};

const Contents: FC<{
  anomaly: MlAnomaliesTableRecordExtended;
  isAggregatedData: boolean;
  influencersLimit: number;
  job: ExplorerJob;
  filter?: EntityCellFilter;
  influencerFilter?: EntityCellFilter;
}> = ({ anomaly, isAggregatedData, filter, influencersLimit, influencerFilter, job }) => {
  const { euiTheme } = useEuiTheme();

  const dividerStyle = useMemo(() => {
    return isPopulatedObject(anomaly.source.anomaly_score_explanation)
      ? { borderRight: `1px solid ${euiTheme.colors.lightShade}` }
      : {};
  }, [euiTheme.colors, anomaly]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <div
          css={{
            padding: euiTheme.size.m,
          }}
          data-test-subj="mlAnomaliesListRowDetails"
        >
          <Description anomaly={anomaly} />
          <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem css={dividerStyle}>
              <Details
                anomaly={anomaly}
                isAggregatedData={isAggregatedData}
                filter={filter}
                job={job}
              />
              <Influencers
                anomaly={anomaly}
                influencerFilter={influencerFilter}
                influencersLimit={influencersLimit}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <AnomalyExplanationDetails anomaly={anomaly} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const Description: FC<{ anomaly: MlAnomaliesTableRecordExtended }> = ({ anomaly }) => {
  const { anomalyDescription, mvDescription } = getAnomalyDescription(anomaly);

  return (
    <>
      <EuiTitle size="xxs">
        <h3>
          <strong>
            <FormattedMessage
              id="xpack.ml.anomaliesTable.anomalyDetails.descriptionTitle"
              defaultMessage="Description"
            />
          </strong>
        </h3>
      </EuiTitle>
      <EuiText size="xs">{anomalyDescription}</EuiText>
      {mvDescription !== undefined && <EuiText size="xs">{mvDescription}</EuiText>}
    </>
  );
};

const Details: FC<{
  anomaly: MlAnomaliesTableRecordExtended;
  isAggregatedData: boolean;
  filter?: EntityCellFilter;
  job: ExplorerJob;
}> = ({ anomaly, isAggregatedData, filter, job }) => {
  const isInterimResult = anomaly.source?.is_interim ?? false;
  return (
    <>
      <EuiTitle size="xxs">
        <h3>
          <strong>
            {isAggregatedData === true ? (
              <FormattedMessage
                id="xpack.ml.anomaliesTable.anomalyDetails.detailsOnHighestSeverityAnomalyTitle"
                defaultMessage="Details on highest severity anomaly"
              />
            ) : (
              <FormattedMessage
                id="xpack.ml.anomaliesTable.anomalyDetails.anomalyDetailsTitle"
                defaultMessage="Anomaly details"
              />
            )}
          </strong>
        </h3>
      </EuiTitle>
      <EuiText size="xs">
        {isInterimResult === true && (
          <>
            <EuiIcon type="warning" />
            <span
              css={{
                fontStyle: 'italic',
              }}
            >
              <FormattedMessage
                id="xpack.ml.anomaliesTable.anomalyDetails.interimResultLabel"
                defaultMessage="Interim result"
              />
            </span>
          </>
        )}
      </EuiText>

      <EuiSpacer size="xs" />

      <DetailsItems anomaly={anomaly} filter={filter} modelPlotEnabled={job.modelPlotEnabled} />
    </>
  );
};

const Influencers: FC<{
  anomaly: MlAnomaliesTableRecordExtended;
  influencersLimit: number;
  influencerFilter?: EntityCellFilter;
}> = ({ anomaly, influencersLimit, influencerFilter }) => {
  const [showAllInfluencers, setShowAllInfluencers] = useState(false);
  const toggleAllInfluencers = setShowAllInfluencers.bind(null, (prev) => !prev);

  const anomalyInfluencers = anomaly.influencers;
  let listItems: Array<{ title: string; description: React.ReactElement }> = [];
  let othersCount = 0;
  let numToDisplay = 0;
  if (anomalyInfluencers !== undefined && influencerFilter !== undefined) {
    numToDisplay =
      showAllInfluencers === true
        ? anomalyInfluencers.length
        : Math.min(influencersLimit, anomalyInfluencers.length);
    othersCount = Math.max(anomalyInfluencers.length - numToDisplay, 0);

    if (othersCount === 1) {
      // Display the 1 extra influencer as displaying "and 1 more" would also take up a line.
      numToDisplay++;
      othersCount = 0;
    }

    listItems = getInfluencersItems(anomalyInfluencers, influencerFilter, numToDisplay);
  }

  if (listItems.length > 0) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h3>
            <strong>
              <FormattedMessage
                id="xpack.ml.anomaliesTable.anomalyDetails.influencersTitle"
                defaultMessage="Influencers"
              />
            </strong>
          </h3>
        </EuiTitle>
        {listItems.map(({ title, description }, index) => (
          <React.Fragment key={`influencer-${index}-${title}`}>
            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem style={{ width: '180px' }} grow={false}>
                {title}
              </EuiFlexItem>
              <EuiFlexItem>{description}</EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
          </React.Fragment>
        ))}
        {othersCount > 0 && (
          <EuiLink onClick={() => toggleAllInfluencers()}>
            <FormattedMessage
              id="xpack.ml.anomaliesTable.anomalyDetails.anomalyDescriptionListMoreLinkText"
              defaultMessage="and {othersCount} more"
              values={{ othersCount }}
            />
          </EuiLink>
        )}
        {numToDisplay > influencersLimit + 1 && (
          <EuiLink onClick={() => toggleAllInfluencers()}>
            <FormattedMessage
              id="xpack.ml.anomaliesTable.anomalyDetails.anomalyDescriptionShowLessLinkText"
              defaultMessage="Show less"
            />
          </EuiLink>
        )}
      </>
    );
  }
  return null;
};

const CategoryExamples: FC<{
  definition?: CategoryDefinition;
  examples: string[];
  error?: string;
}> = ({ definition, examples, error }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      direction="column"
      justifyContent="center"
      gutterSize="xs"
      css={{
        padding: euiTheme.size.l,
      }}
    >
      {error && (
        <EuiFlexItem>
          <EuiCallOut
            announceOnMount
            size="s"
            color="danger"
            iconType="warning"
            title={i18n.translate(
              'xpack.ml.anomaliesTable.anomalyDetails.categoryDefinitionErrorTitle',
              { defaultMessage: 'An error occurred loading category definition:' }
            )}
            data-test-subj="mlAnomaliesTableCategoryDefinitionError"
          >
            <EuiText size="xs">{error}</EuiText>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </EuiFlexItem>
      )}
      {definition !== undefined && definition.terms && (
        <>
          <EuiFlexItem key={`example-terms`}>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h3>
                    <strong>
                      {i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.termsTitle', {
                        defaultMessage: 'Terms',
                      })}
                    </strong>
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  aria-label={i18n.translate(
                    'xpack.ml.anomaliesTable.anomalyDetails.termsDescriptionAriaLabel',
                    {
                      defaultMessage: 'Description',
                    }
                  )}
                  type="question"
                  color="subdued"
                  size="s"
                  content={
                    <FormattedMessage
                      id="xpack.ml.anomaliesTable.anomalyDetails.termsDescriptionTooltip"
                      defaultMessage="A space separated list of the common tokens that are matched in values of the category
                  (may have been truncated to a max character limit of {maxChars})"
                      values={{ maxChars: MAX_CHARS }}
                    />
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiText size="xs">{definition.terms}</EuiText>
          </EuiFlexItem>
          <EuiSpacer size="xs" />
        </>
      )}
      {definition !== undefined && definition.regex && (
        <>
          <EuiFlexItem key={`example-regex`}>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h3>
                    <strong>
                      {i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.regexTitle', {
                        defaultMessage: 'Regex',
                      })}
                    </strong>
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  aria-label={i18n.translate(
                    'xpack.ml.anomaliesTable.anomalyDetails.regexDescriptionAriaLabel',
                    {
                      defaultMessage: 'Description',
                    }
                  )}
                  type="question"
                  color="subdued"
                  size="s"
                  content={
                    <FormattedMessage
                      id="xpack.ml.anomaliesTable.anomalyDetails.regexDescriptionTooltip"
                      defaultMessage="The regular expression that is used to search for values that match the category
                    (may have been truncated to a max character limit of {maxChars})"
                      values={{ maxChars: MAX_CHARS }}
                    />
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiText size="xs">{definition.regex}</EuiText>
          </EuiFlexItem>
          <EuiSpacer size="xs" />
        </>
      )}

      {examples.map((example, i) => {
        return (
          <EuiFlexItem key={`example${i}`}>
            {i === 0 && definition !== undefined && (
              <EuiTitle size="xxs">
                <h3>
                  <strong>
                    {i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.examplesTitle', {
                      defaultMessage: 'Examples',
                    })}
                  </strong>
                </h3>
              </EuiTitle>
            )}
            <EuiText size="xs">
              <span
                css={{
                  fontFamily: euiTheme.font.familyCode,
                }}
              >
                {example}
              </span>
            </EuiText>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
