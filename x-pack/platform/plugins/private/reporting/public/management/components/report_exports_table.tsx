/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Component, Fragment, default as React } from 'react';
import { Subscription } from 'rxjs';

import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiSpacer,
  UseEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { ILicense } from '@kbn/licensing-plugin/public';
import { durationToNumber, REPORT_TABLE_ID, REPORT_TABLE_ROW_ID } from '@kbn/reporting-common';

import { checkLicense, Job } from '@kbn/reporting-public';
import { ListingPropsInternal } from '..';
import { prettyPrintJobType } from '../../../common/job_utils';
import { Poller } from '../../../common/poller';
import { ReportDeleteButton, ReportInfoFlyout, ReportStatusIndicator } from '.';
import { guessAppIconTypeFromObjectType, getDisplayNameFromObjectType } from '../utils';
import { NO_CREATED_REPORTS_DESCRIPTION } from '../../translations';
import { TruncatedTitle } from './truncated_title';

type TableColumn = EuiBasicTableColumn<Job>;

interface State {
  page: number;
  perPage?: number;
  total: number;
  jobs: Job[];
  selectedJobs: Job[];
  isLoading: boolean;
  showLinks: boolean;
  enableLinks: boolean;
  badLicenseMessage: string;
  selectedJob: undefined | Job;
}

export class ReportExportsTable extends Component<ListingPropsInternal, State> {
  private isInitialJobsFetch: boolean;
  private licenseSubscription?: Subscription;
  private mounted?: boolean;
  private poller?: Poller;

  constructor(props: ListingPropsInternal) {
    super(props);

    this.state = {
      page: 0,
      perPage: 50,
      total: 0,
      jobs: [],
      selectedJobs: [],
      isLoading: false,
      showLinks: false,
      enableLinks: false,
      badLicenseMessage: '',
      selectedJob: undefined,
    };

    this.isInitialJobsFetch = true;
  }

  public componentWillUnmount() {
    this.mounted = false;
    this.poller?.stop();

    if (this.licenseSubscription) {
      this.licenseSubscription.unsubscribe();
    }
  }

  public componentDidMount() {
    this.mounted = true;
    const { config, license$ } = this.props;
    const pollFrequencyInMillis = durationToNumber(config.poll.jobsRefresh.interval);
    this.poller = new Poller({
      functionToPoll: () => {
        return this.fetchJobs();
      },
      pollFrequencyInMillis,
      trailing: false,
      continuePollingOnError: true,
      pollFrequencyErrorMultiplier: config.poll.jobsRefresh.intervalErrorMultiplier,
    });
    this.poller.start();
    this.licenseSubscription = license$.subscribe(this.licenseHandler);
  }

  private licenseHandler = (license: ILicense) => {
    const {
      enableLinks,
      showLinks,
      message: badLicenseMessage,
    } = checkLicense(license.check('reporting', 'basic'));

    this.setState({
      enableLinks,
      showLinks,
      badLicenseMessage,
    });
  };

  private onSelectionChange = (jobs: Job[]) => {
    this.setState((current) => ({ ...current, selectedJobs: jobs }));
  };

  private removeJob = (job: Job) => {
    const { jobs } = this.state;
    const filtered = jobs.filter((j) => j.id !== job.id);
    this.setState((current) => ({ ...current, jobs: filtered }));
  };

  private renderDeleteButton = () => {
    const { selectedJobs } = this.state;
    if (selectedJobs.length === 0) return undefined;

    const performDelete = async () => {
      for (const job of selectedJobs) {
        try {
          await this.props.apiClient.deleteReport(job.id);
          this.removeJob(job);
          this.props.toasts.addSuccess(
            i18n.translate('xpack.reporting.exports.table.deleteConfirm', {
              defaultMessage: `The {reportTitle} report was deleted`,
              values: {
                reportTitle: job.title,
              },
            })
          );
        } catch (error) {
          this.props.toasts.addDanger(
            i18n.translate('xpack.reporting.exports.table.deleteFailedErrorMessage', {
              defaultMessage: `The report was not deleted: {error}`,
              values: { error },
            })
          );
          throw error;
        }
      }
    };

    return (
      <ReportDeleteButton
        jobsToDelete={selectedJobs}
        performDelete={performDelete}
        {...this.props}
      />
    );
  };

  private onTableChange = ({ page }: { page: { index: number; size: number } }) => {
    const { index: pageIndex, size: perPage } = page;
    this.setState(() => ({ page: pageIndex, perPage }), this.fetchJobs);
  };

  private fetchJobs = async () => {
    // avoid page flicker when poller is updating table - only display loading screen on first load
    if (this.isInitialJobsFetch) {
      this.setState(() => ({ isLoading: true }));
    }

    let jobs: Job[];
    let total: number;
    try {
      jobs = await this.props.apiClient.list(this.state.page, this.state.perPage);
      total = await this.props.apiClient.total();

      this.isInitialJobsFetch = false;
    } catch (fetchError) {
      if (!this.licenseAllowsToShowThisPage()) {
        this.props.toasts.addDanger(this.state.badLicenseMessage);
        this.props.redirect('management');
        return;
      }

      if (fetchError.message === 'Failed to fetch') {
        this.props.toasts.addDanger(
          fetchError.message ||
            i18n.translate('xpack.reporting.exports.table.requestFailedErrorMessage', {
              defaultMessage: 'Request failed',
            })
        );
      }
      if (this.mounted) {
        this.setState(() => ({ isLoading: false, jobs: [], total: 0 }));
      }
      return;
    }

    if (this.mounted) {
      this.setState(() => ({
        isLoading: false,
        total,
        jobs,
      }));
    }
  };

  private licenseAllowsToShowThisPage = () => {
    return this.state.showLinks && this.state.enableLinks;
  };

  /**
   * Widths like this are not the best, but the auto-layout does not play well with text in links. We can update
   * this with something that works better on all screen sizes. This works for desktop, mobile fallback is provided on a
   * per column basis.
   */
  private readonly tableColumnWidths = {
    type: '5%',
    title: '25%',
    status: '20%',
    createdAt: '21%',
    content: '7%',
    exportType: '12%',
    actions: '10%',
  };

  public render() {
    const { tableColumnWidths } = this;
    const tableColumns: TableColumn[] = [
      {
        field: 'type',
        width: tableColumnWidths.type,
        name: i18n.translate('xpack.reporting.exports.tableColumns.typeTitle', {
          defaultMessage: 'Type',
        }),
        render: (_type: string, job) => {
          return (
            <div css={({ euiTheme }: UseEuiTheme) => css({ paddingLeft: euiTheme.size.s })}>
              <EuiIconTip
                type={guessAppIconTypeFromObjectType(job.objectType)}
                size="s"
                data-test-subj="reportJobType"
                content={getDisplayNameFromObjectType(job.objectType)}
              />
            </div>
          );
        },
        mobileOptions: {
          show: true,
          render: (job) => {
            return <div data-test-subj="reportJobType">{job.objectType}</div>;
          },
        },
      },
      {
        field: 'title',
        name: i18n.translate('xpack.reporting.exports.tableColumns.reportTitle', {
          defaultMessage: 'Name',
        }),
        width: tableColumnWidths.title,
        render: (objectTitle: string, job) => {
          return (
            <div
              data-test-subj="reportingListItemObjectTitle"
              css={({ euiTheme }: UseEuiTheme) => css({ paddingTop: euiTheme.size.s })}
            >
              <EuiLink
                data-test-subj={`viewReportingLink-${job.id}`}
                onClick={() => this.setState({ selectedJob: job })}
              >
                <TruncatedTitle
                  text={
                    objectTitle ||
                    i18n.translate('xpack.reporting.exports.table.noTitleLabel', {
                      defaultMessage: 'Untitled',
                    })
                  }
                />
              </EuiLink>
            </div>
          );
        },
        mobileOptions: {
          header: false,
          width: '100%', // This is not recognized by EUI types but has an effect, leaving for now
        } as unknown as { header: boolean },
      },
      {
        field: 'status',
        width: tableColumnWidths.status,
        name: i18n.translate('xpack.reporting.exports.tableColumns.statusTitle', {
          defaultMessage: 'Status',
        }),
        render: (_status: string, job) => {
          return (
            <EuiFlexGroup
              gutterSize="none"
              responsive={false}
              alignItems="center"
              data-test-subj="reportJobStatus"
            >
              <ReportStatusIndicator job={job} />
            </EuiFlexGroup>
          );
        },
        mobileOptions: {
          show: false,
        },
      },
      {
        field: 'created_at',
        width: tableColumnWidths.createdAt,
        name: i18n.translate('xpack.reporting.exports.tableColumns.createdAtTitle', {
          defaultMessage: 'Created at',
        }),
        render: (_createdAt: string, job) => (
          <div data-test-subj="reportJobCreatedAt">{job.getCreatedAtDate()}</div>
        ),
        mobileOptions: {
          show: false,
        },
      },
      {
        field: 'content',
        width: tableColumnWidths.content,
        name: i18n.translate('xpack.reporting.exports.tableColumns.content', {
          defaultMessage: 'Content',
        }),
        render: (_status: string, job) => (
          <div data-test-subj="reportJobContent">{prettyPrintJobType(job.jobtype)}</div>
        ),
        mobileOptions: {
          show: false,
        },
      },
      {
        field: 'scheduled_report_id',
        width: tableColumnWidths.exportType,
        name: i18n.translate('xpack.reporting.exports.tableColumns.exportType', {
          defaultMessage: 'Export type',
        }),
        render: (_scheduledReportId: string) => {
          const exportType = _scheduledReportId
            ? i18n.translate('xpack.reporting.exports.exportType.scheduled', {
                defaultMessage: 'Scheduled',
              })
            : i18n.translate('xpack.reporting.exports.exportType.single', {
                defaultMessage: 'Single',
              });

          return (
            <EuiBadge data-test-subj={`reportExportType-${exportType}`} color="hollow">
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIconTip type={_scheduledReportId ? 'calendar' : 'download'} size="s" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{exportType}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiBadge>
          );
        },
        mobileOptions: {
          show: false,
        },
      },
      {
        name: i18n.translate('xpack.reporting.exports.tableColumns.actionsTitle', {
          defaultMessage: 'Actions',
        }),
        width: tableColumnWidths.actions,
        actions: [
          {
            isPrimary: true,
            'data-test-subj': (job) => `reportDownloadLink-${job.id}`,
            type: 'icon',
            icon: 'download',
            name: i18n.translate('xpack.reporting.exports.table.downloadReportButtonLabel', {
              defaultMessage: 'Download report',
            }),
            description: i18n.translate('xpack.reporting.exports.table.downloadReportDescription', {
              defaultMessage: 'Download this report in a new tab.',
            }),
            onClick: (job) => this.props.apiClient.downloadReport(job.id),
            enabled: (job) => job.isDownloadReady,
          },
          {
            name: i18n.translate(
              'xpack.reporting.exports.table.viewReportingInfoActionButtonLabel',
              {
                defaultMessage: 'View report info',
              }
            ),
            description: i18n.translate(
              'xpack.reporting.exports.table.viewReportingInfoActionButtonDescription',
              {
                defaultMessage: 'View additional information about this report.',
              }
            ),
            'data-test-subj': 'reportViewInfoLink',
            type: 'icon',
            icon: 'info',
            onClick: (job) => this.setState({ selectedJob: job }),
          },
          {
            name: i18n.translate('xpack.reporting.exports.table.openInKibanaAppLabel', {
              defaultMessage: 'Open Dashboard',
            }),
            'data-test-subj': 'reportOpenInKibanaApp',
            description: i18n.translate(
              'xpack.reporting.exports.table.openInKibanaAppDescription',
              {
                defaultMessage: 'Open the Kibana app where this report was generated.',
              }
            ),
            available: (job) => job.canLinkToKibanaApp,
            type: 'icon',
            icon: 'popout',
            onClick: (job) => {
              const href = this.props.apiClient.getKibanaAppHref(job);
              window.open(href, '_blank');
              window.focus();
            },
          },
        ],
      },
    ];

    const pagination = {
      pageIndex: this.state.page,
      pageSize: this.state.perPage,
      totalItemCount: this.state.total,
      showPerPageOptions: true,
    };

    const selection = {
      itemId: 'id',
      onSelectionChange: this.onSelectionChange,
    };

    return (
      <Fragment>
        <EuiSpacer size={'l'} />
        {this.state.selectedJobs.length > 0 && (
          <div>
            <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="m">
              <EuiFlexItem grow={false}>{this.renderDeleteButton()}</EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
          </div>
        )}
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.reporting.exports.table.captionDescription', {
            defaultMessage: 'Reports generated in Kibana applications',
          })}
          itemId="id"
          items={this.state.jobs}
          loading={this.state.isLoading}
          columns={tableColumns}
          noItemsMessage={NO_CREATED_REPORTS_DESCRIPTION}
          pagination={pagination}
          selection={selection}
          onChange={this.onTableChange}
          data-test-subj={REPORT_TABLE_ID}
          rowProps={() => ({ 'data-test-subj': REPORT_TABLE_ROW_ID })}
        />
        {!!this.state.selectedJob && (
          <ReportInfoFlyout
            config={this.props.config}
            onClose={() => this.setState({ selectedJob: undefined })}
            job={this.state.selectedJob}
          />
        )}
      </Fragment>
    );
  }
}

// eslint-disable-next-line import/no-default-export
export { ReportExportsTable as default };
