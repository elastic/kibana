/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import moment from 'moment';
import rison from 'rison-node';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { EuiButtonIcon, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import chrome from 'ui/chrome';
import { toastNotifications } from 'ui/notify';

import { ES_FIELD_TYPES } from '../../../../../../../src/plugins/data/public';
import { checkPermission } from '../../privilege/check_privilege';
import { SEARCH_QUERY_LANGUAGE } from '../../../common/constants/search';
import { isRuleSupported } from '../../../common/util/anomaly_utils';
import { parseInterval } from '../../../common/util/parse_interval';
import { escapeDoubleQuotes } from '../kql_filter_bar/utils';
import { getFieldTypeFromMapping } from '../../services/mapping_service';
import { ml } from '../../services/ml_api_service';
import { mlJobService } from '../../services/job_service';
import { getUrlForRecord, openCustomUrlWindow } from '../../util/custom_url_utils';
import { formatHumanReadableDateTimeSeconds } from '../../util/date_utils';
import { getIndexPatterns } from '../../util/index_utils';
import { replaceStringTokens } from '../../util/string_utils';

/*
 * Component for rendering the links menu inside a cell in the anomalies table.
 */
export const LinksMenu = injectI18n(
  class LinksMenu extends Component {
    static propTypes = {
      anomaly: PropTypes.object.isRequired,
      showViewSeriesLink: PropTypes.bool,
      isAggregatedData: PropTypes.bool,
      interval: PropTypes.string,
      timefilter: PropTypes.object.isRequired,
      showRuleEditorFlyout: PropTypes.func,
    };

    constructor(props) {
      super(props);

      this.state = {
        isPopoverOpen: false,
        toasts: [],
      };
    }

    openCustomUrl = customUrl => {
      const { anomaly, interval, isAggregatedData, intl } = this.props;

      console.log('Anomalies Table - open customUrl for record:', anomaly);

      // If url_value contains $earliest$ and $latest$ tokens, add in times to the source record.
      // Create a copy of the record as we are adding properties into it.
      const record = _.cloneDeep(anomaly.source);
      const timestamp = record.timestamp;
      const configuredUrlValue = customUrl.url_value;
      const timeRangeInterval = parseInterval(customUrl.time_range);
      if (configuredUrlValue.includes('$earliest$')) {
        let earliestMoment = moment(timestamp);
        if (timeRangeInterval !== null) {
          earliestMoment.subtract(timeRangeInterval);
        } else {
          earliestMoment = moment(timestamp).startOf(interval);
          if (interval === 'hour') {
            // Start from the previous hour.
            earliestMoment.subtract(1, 'h');
          }
        }
        record.earliest = earliestMoment.toISOString(); // e.g. 2016-02-08T16:00:00.000Z
      }

      if (configuredUrlValue.includes('$latest$')) {
        let latestMoment = moment(timestamp).add(record.bucket_span, 's');
        if (timeRangeInterval !== null) {
          latestMoment.add(timeRangeInterval);
        } else {
          if (isAggregatedData === true) {
            latestMoment = moment(timestamp).endOf(interval);
            if (interval === 'hour') {
              // Show to the end of the next hour.
              latestMoment.add(1, 'h'); // e.g. 2016-02-08T18:59:59.999Z
            }
          }
        }
        record.latest = latestMoment.toISOString();
      }

      // If url_value contains $mlcategoryterms$ or $mlcategoryregex$, add in the
      // terms and regex for the selected categoryId to the source record.
      if (
        (configuredUrlValue.includes('$mlcategoryterms$') ||
          configuredUrlValue.includes('$mlcategoryregex$')) &&
        _.has(record, 'mlcategory')
      ) {
        const jobId = record.job_id;

        // mlcategory in the source record will be an array
        // - use first value (will only ever be more than one if influenced by category other than by/partition/over).
        const categoryId = record.mlcategory[0];

        ml.results
          .getCategoryDefinition(jobId, categoryId)
          .then(resp => {
            // Prefix each of the terms with '+' so that the Elasticsearch Query String query
            // run in a drilldown Kibana dashboard has to match on all terms.
            const termsArray = resp.terms.split(' ').map(term => `+${term}`);
            record.mlcategoryterms = termsArray.join(' ');
            record.mlcategoryregex = resp.regex;

            // Replace any tokens in the configured url_value with values from the source record,
            // and then open link in a new tab/window.
            const urlPath = replaceStringTokens(customUrl.url_value, record, true);
            openCustomUrlWindow(urlPath, customUrl);
          })
          .catch(resp => {
            console.log('openCustomUrl(): error loading categoryDefinition:', resp);
            toastNotifications.addDanger(
              intl.formatMessage(
                {
                  id: 'xpack.ml.anomaliesTable.linksMenu.unableToOpenLinkErrorMessage',
                  defaultMessage:
                    'Unable to open link as an error occurred loading details on category ID {categoryId}',
                },
                {
                  categoryId,
                }
              )
            );
          });
      } else {
        // Replace any tokens in the configured url_value with values from the source record,
        // and then open link in a new tab/window.
        const urlPath = getUrlForRecord(customUrl, record);
        openCustomUrlWindow(urlPath, customUrl);
      }
    };

    viewSeries = () => {
      const record = this.props.anomaly.source;
      const bounds = this.props.timefilter.getActiveBounds();
      const from = bounds.min.toISOString(); // e.g. 2016-02-08T16:00:00.000Z
      const to = bounds.max.toISOString();

      // Zoom to show 50 buckets either side of the record.
      const recordTime = moment(record.timestamp);
      const zoomFrom = recordTime.subtract(50 * record.bucket_span, 's').toISOString();
      const zoomTo = recordTime.add(100 * record.bucket_span, 's').toISOString();

      // Extract the by, over and partition fields for the record.
      const entityCondition = {};

      if (_.has(record, 'partition_field_value')) {
        entityCondition[record.partition_field_name] = record.partition_field_value;
      }

      if (_.has(record, 'over_field_value')) {
        entityCondition[record.over_field_name] = record.over_field_value;
      }

      if (_.has(record, 'by_field_value')) {
        // Note that analyses with by and over fields, will have a top-level by_field_name,
        // but the by_field_value(s) will be in the nested causes array.
        // TODO - drilldown from cause in expanded row only?
        entityCondition[record.by_field_name] = record.by_field_value;
      }

      // Use rison to build the URL .
      const _g = rison.encode({
        ml: {
          jobIds: [record.job_id],
        },
        refreshInterval: {
          display: 'Off',
          pause: false,
          value: 0,
        },
        time: {
          from: from,
          to: to,
          mode: 'absolute',
        },
      });

      const _a = rison.encode({
        mlTimeSeriesExplorer: {
          zoom: {
            from: zoomFrom,
            to: zoomTo,
          },
          detectorIndex: record.detector_index,
          entities: entityCondition,
        },
        query: {
          query_string: {
            analyze_wildcard: true,
            query: '*',
          },
        },
      });

      // Need to encode the _a parameter in case any entities contain unsafe characters such as '+'.
      let path = `${chrome.getBasePath()}/app/ml#/timeseriesexplorer`;
      path += `?_g=${_g}&_a=${encodeURIComponent(_a)}`;
      window.open(path, '_blank');
    };

    viewExamples = () => {
      const { intl } = this.props;
      const categoryId = this.props.anomaly.entityValue;
      const record = this.props.anomaly.source;
      const indexPatterns = getIndexPatterns();

      const job = mlJobService.getJob(this.props.anomaly.jobId);
      if (job === undefined) {
        console.log(`viewExamples(): no job found with ID: ${this.props.anomaly.jobId}`);
        toastNotifications.addDanger(
          intl.formatMessage(
            {
              id: 'xpack.ml.anomaliesTable.linksMenu.unableToViewExamplesErrorMessage',
              defaultMessage:
                'Unable to view examples as no details could be found for job ID {jobId}',
            },
            {
              jobId: this.props.anomaly.jobId,
            }
          )
        );
        return;
      }
      const categorizationFieldName = job.analysis_config.categorization_field_name;
      const datafeedIndices = job.datafeed_config.indices;
      // Find the type of the categorization field i.e. text (preferred) or keyword.
      // Uses the first matching field found in the list of indices in the datafeed_config.
      // attempt to load the field type using each index. we have to do it this way as _field_caps
      // doesn't specify which index a field came from unless there is a clash.
      let i = 0;
      findFieldType(datafeedIndices[i]);

      function findFieldType(index) {
        getFieldTypeFromMapping(index, categorizationFieldName)
          .then(resp => {
            if (resp !== '') {
              createAndOpenUrl(index, resp);
            } else {
              i++;
              if (i < datafeedIndices.length) {
                findFieldType(datafeedIndices[i]);
              } else {
                error();
              }
            }
          })
          .catch(() => {
            error();
          });
      }

      function createAndOpenUrl(index, categorizationFieldType) {
        // Find the ID of the index pattern with a title attribute which matches the
        // index configured in the datafeed. If a Kibana index pattern has not been created
        // for this index, then the user will see a warning message on the Discover tab advising
        // them that no matching index pattern has been configured.
        let indexPatternId = index;
        for (let j = 0; j < indexPatterns.length; j++) {
          if (indexPatterns[j].get('title') === index) {
            indexPatternId = indexPatterns[j].id;
            break;
          }
        }

        // Get the definition of the category and use the terms or regex to view the
        // matching events in the Kibana Discover tab depending on whether the
        // categorization field is of mapping type text (preferred) or keyword.
        ml.results
          .getCategoryDefinition(record.job_id, categoryId)
          .then(resp => {
            let query = null;
            // Build query using categorization regex (if keyword type) or terms (if text type).
            // Check for terms or regex in case categoryId represents an anomaly from the absence of the
            // categorization field in documents (usually indicated by a categoryId of -1).
            if (categorizationFieldType === ES_FIELD_TYPES.KEYWORD) {
              if (resp.regex) {
                query = {
                  language: SEARCH_QUERY_LANGUAGE.LUCENE,
                  query: `${categorizationFieldName}:/${resp.regex}/`,
                };
              }
            } else {
              if (resp.terms) {
                const escapedTerms = escapeDoubleQuotes(resp.terms);
                query = {
                  language: SEARCH_QUERY_LANGUAGE.KUERY,
                  query:
                    `${categorizationFieldName}:"` +
                    escapedTerms.split(' ').join(`" and ${categorizationFieldName}:"`) +
                    '"',
                };
              }
            }

            const recordTime = moment(record.timestamp);
            const from = recordTime.toISOString();
            const to = recordTime.add(record.bucket_span, 's').toISOString();

            // Use rison to build the URL .
            const _g = rison.encode({
              refreshInterval: {
                display: 'Off',
                pause: false,
                value: 0,
              },
              time: {
                from: from,
                to: to,
                mode: 'absolute',
              },
            });

            const appStateProps = {
              index: indexPatternId,
              filters: [],
            };
            if (query !== null) {
              appStateProps.query = query;
            }
            const _a = rison.encode(appStateProps);

            // Need to encode the _a parameter as it will contain characters such as '+' if using the regex.
            let path = chrome.getBasePath();
            path += '/app/kibana#/discover';
            path += '?_g=' + _g;
            path += '&_a=' + encodeURIComponent(_a);
            window.open(path, '_blank');
          })
          .catch(resp => {
            console.log('viewExamples(): error loading categoryDefinition:', resp);
            toastNotifications.addDanger(
              intl.formatMessage(
                {
                  id: 'xpack.ml.anomaliesTable.linksMenu.loadingDetailsErrorMessage',
                  defaultMessage:
                    'Unable to view examples as an error occurred loading details on category ID {categoryId}',
                },
                {
                  categoryId,
                }
              )
            );
          });
      }

      function error() {
        console.log(
          `viewExamples(): error finding type of field ${categorizationFieldName} in indices:`,
          datafeedIndices
        );
        toastNotifications.addDanger(
          intl.formatMessage(
            {
              id: 'xpack.ml.anomaliesTable.linksMenu.noMappingCouldBeFoundErrorMessage',
              defaultMessage:
                'Unable to view examples of documents with mlcategory {categoryId} ' +
                'as no mapping could be found for the categorization field {categorizationFieldName}',
            },
            {
              categoryId,
              categorizationFieldName,
            }
          )
        );
      }
    };

    onButtonClick = () => {
      this.setState(prevState => ({
        isPopoverOpen: !prevState.isPopoverOpen,
      }));
    };

    closePopover = () => {
      this.setState({
        isPopoverOpen: false,
      });
    };

    render() {
      const { anomaly, showViewSeriesLink, intl } = this.props;
      const canConfigureRules = isRuleSupported(anomaly.source) && checkPermission('canUpdateJob');

      const button = (
        <EuiButtonIcon
          size="s"
          color="text"
          onClick={this.onButtonClick}
          iconType="gear"
          aria-label={intl.formatMessage(
            {
              id: 'xpack.ml.anomaliesTable.linksMenu.selectActionAriaLabel',
              defaultMessage: 'Select action for anomaly at {time}',
            },
            { time: formatHumanReadableDateTimeSeconds(anomaly.time) }
          )}
        />
      );

      const items = [];
      if (anomaly.customUrls !== undefined) {
        anomaly.customUrls.forEach((customUrl, index) => {
          items.push(
            <EuiContextMenuItem
              key={`custom_url_${index}`}
              icon="popout"
              onClick={() => {
                this.closePopover();
                this.openCustomUrl(customUrl);
              }}
            >
              {customUrl.url_name}
            </EuiContextMenuItem>
          );
        });
      }

      if (showViewSeriesLink === true && anomaly.isTimeSeriesViewRecord === true) {
        items.push(
          <EuiContextMenuItem
            key="view_series"
            icon="stats"
            onClick={() => {
              this.closePopover();
              this.viewSeries();
            }}
          >
            <FormattedMessage
              id="xpack.ml.anomaliesTable.linksMenu.viewSeriesLabel"
              defaultMessage="View series"
            />
          </EuiContextMenuItem>
        );
      }

      if (anomaly.entityName === 'mlcategory') {
        items.push(
          <EuiContextMenuItem
            key="view_examples"
            icon="popout"
            onClick={() => {
              this.closePopover();
              this.viewExamples();
            }}
          >
            <FormattedMessage
              id="xpack.ml.anomaliesTable.linksMenu.viewExamplesLabel"
              defaultMessage="View examples"
            />
          </EuiContextMenuItem>
        );
      }

      if (canConfigureRules) {
        items.push(
          <EuiContextMenuItem
            key="create_rule"
            icon="controlsHorizontal"
            onClick={() => {
              this.closePopover();
              this.props.showRuleEditorFlyout(anomaly);
            }}
          >
            <FormattedMessage
              id="xpack.ml.anomaliesTable.linksMenu.configureRulesLabel"
              defaultMessage="Configure rules"
            />
          </EuiContextMenuItem>
        );
      }

      return (
        <EuiPopover
          id="singlePanel"
          button={button}
          isOpen={this.state.isPopoverOpen}
          closePopover={this.closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel items={items} />
        </EuiPopover>
      );
    }
  }
);
