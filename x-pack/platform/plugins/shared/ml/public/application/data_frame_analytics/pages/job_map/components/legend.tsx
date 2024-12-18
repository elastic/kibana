/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  useEuiTheme,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroupItem,
  EuiListGroup,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { JOB_MAP_NODE_TYPES } from '@kbn/ml-data-frame-analytics-utils';

const getJobTypeList = () => (
  <>
    <EuiListGroup flush>
      <EuiListGroupItem iconType="outlierDetectionJob" label="Outlier detection" size="xs" />

      <EuiListGroupItem iconType="regressionJob" label="Regression" size="xs" />

      <EuiListGroupItem iconType="classificationJob" label="Classification" size="xs" />
    </EuiListGroup>
  </>
);

export const JobMapLegend: FC<{ hasMissingJobNode: boolean }> = ({ hasMissingJobNode }) => {
  const { euiTheme } = useEuiTheme();

  const [showJobTypes, setShowJobTypes] = useState<boolean>(false);

  const euiSizeM = euiTheme.size.m;
  const euiSizeS = euiTheme.size.s;
  const euiColorFullShade = euiTheme.colors.fullShade;
  const euiColorGhost = euiTheme.colors.ghost;
  const euiColorWarning = euiTheme.colors.warning;
  const euiBorderThin = euiTheme.border.thin;
  const euiBorderRadius = euiTheme.border.radius.medium;
  const euiBorderRadiusSmall = euiTheme.border.radius.small;
  const euiBorderWidthThick = euiTheme.border.width.thick;
  const euiPageBackgroundColor = euiTheme.colors.backgroundBasePlain;

  // Amsterdam: euiTheme.colors.vis.euiColorVis2
  // Borealis:  euiTheme.colors.vis.euiColorVis4
  const borderColorIndexPattern = euiTheme.flags.hasVisColorAdjustment
    ? euiTheme.colors.vis.euiColorVis2
    : euiTheme.colors.vis.euiColorVis4;

  // Amsterdam: euiTheme.colors.vis.euiColorVis7
  // Borealis:  euiTheme.colors.vis.euiColorVis8
  const borderColorIngestPipeline = euiTheme.flags.hasVisColorAdjustment
    ? euiTheme.colors.vis.euiColorVis7
    : euiTheme.colors.vis.euiColorVis8;

  // Amsterdam: euiTheme.colors.vis.euiColorVis1
  // Borealis:  euiTheme.colors.vis.euiColorVis2
  const borderColorTransform = euiTheme.flags.hasVisColorAdjustment
    ? euiTheme.colors.vis.euiColorVis1
    : euiTheme.colors.vis.euiColorVis2;

  // Amsterdam: euiTheme.colors.vis.euiColorVis3
  // Borealis:  euiTheme.colors.vis.euiColorVis5
  const borderBottomColorTrainedModel = euiTheme.flags.hasVisColorAdjustment
    ? euiTheme.colors.vis.euiColorVis3
    : euiTheme.colors.vis.euiColorVis5;

  // Amsterdam + Borealis
  const borderColorAnalytics = euiTheme.colors.vis.euiColorVis0;

  const cssOverrideBase = useMemo(
    () => ({
      height: euiSizeM,
      width: euiSizeM,
      backgroundColor: euiColorGhost,
      display: 'inline-block',
    }),
    [euiSizeM, euiColorGhost]
  );

  return (
    <EuiFlexGroup alignItems="center" data-test-subj="mlPageDataFrameAnalyticsMapLegend">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <span
              data-test-subj="mlJobMapLegend__sourceNode"
              css={{
                ...cssOverrideBase,
                backgroundColor: euiColorWarning,
                border: euiBorderThin,
                borderRadius: euiBorderRadius,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.legend.rootNodeLabel"
                defaultMessage="source node"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <span
              data-test-subj="mlJobMapLegend__indexPattern"
              css={{
                ...cssOverrideBase,
                border: `${euiBorderWidthThick} solid ${borderColorIndexPattern}`,
                transform: 'rotate(45deg)',
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.legend.indexLabel"
                defaultMessage="index"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <span
              data-test-subj="mlJobMapLegend__ingestPipeline"
              css={{
                ...cssOverrideBase,
                border: `${euiBorderWidthThick} solid ${borderColorIngestPipeline}`,
                borderRadius: euiBorderRadiusSmall,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.legend.ingestPipelineLabel"
                defaultMessage="ingest pipeline"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <span
              data-test-subj="mlJobMapLegend__transform"
              css={{
                ...cssOverrideBase,
                border: `${euiBorderWidthThick} solid ${borderColorTransform}`,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {JOB_MAP_NODE_TYPES.TRANSFORM}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <span
              style={{
                display: 'inline-block',
                width: '0px',
                height: '0px',
                borderLeft: `${euiSizeS} solid ${euiPageBackgroundColor}`,
                borderRight: `${euiSizeS} solid ${euiPageBackgroundColor}`,
                borderBottom: `${euiSizeM} solid ${borderBottomColorTrainedModel}`,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.legend.trainedModelLabel"
                defaultMessage="trained model"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {hasMissingJobNode ? (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <span
                data-test-subj="mlJobMapLegend__analyticsMissing"
                css={{
                  ...cssOverrideBase,
                  border: `${euiBorderWidthThick} solid ${euiColorFullShade}`,
                  borderRadius: '50%',
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.ml.dataframe.analyticsMap.legend.missingAnalyticsJobLabel"
                  defaultMessage="missing analytics job"
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <span
              data-test-subj="mlJobMapLegend__analytics"
              css={{
                ...cssOverrideBase,
                border: `${euiBorderWidthThick} solid ${borderColorAnalytics}`,
                borderRadius: '50%',
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.ml.dataframe.analyticsMap.legend.analyticsJobLabel"
                    defaultMessage="analytics jobs"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  ownFocus
                  button={
                    <EuiButtonIcon
                      iconSize="s"
                      onClick={() => setShowJobTypes(!showJobTypes)}
                      iconType={showJobTypes ? 'arrowUp' : 'arrowDown'}
                      aria-label={i18n.translate(
                        'xpack.ml.dataframe.analyticsMap.legend.showJobTypesAriaLabel',
                        {
                          defaultMessage: 'Show job types',
                        }
                      )}
                    />
                  }
                  isOpen={showJobTypes}
                  closePopover={() => setShowJobTypes(false)}
                >
                  {getJobTypeList()}
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
