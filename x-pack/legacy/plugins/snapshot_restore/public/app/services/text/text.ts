/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { REPOSITORY_TYPES, TIME_UNITS } from '../../../../common/constants';

class TextService {
  public breadcrumbs: { [key: string]: string } = {};
  public i18n: any;
  private repositoryTypeNames: { [key: string]: string } = {};

  public init(i18n: any): void {
    this.i18n = i18n;
    this.repositoryTypeNames = {
      [REPOSITORY_TYPES.fs]: i18n.translate(
        'xpack.snapshotRestore.repositoryType.fileSystemTypeName',
        {
          defaultMessage: 'Shared file system',
        }
      ),
      [REPOSITORY_TYPES.url]: i18n.translate(
        'xpack.snapshotRestore.repositoryType.readonlyTypeName',
        {
          defaultMessage: 'Read-only URL',
        }
      ),
      [REPOSITORY_TYPES.s3]: i18n.translate('xpack.snapshotRestore.repositoryType.s3TypeName', {
        defaultMessage: 'AWS S3',
      }),
      [REPOSITORY_TYPES.hdfs]: i18n.translate('xpack.snapshotRestore.repositoryType.hdfsTypeName', {
        defaultMessage: 'Hadoop HDFS',
      }),
      [REPOSITORY_TYPES.azure]: i18n.translate(
        'xpack.snapshotRestore.repositoryType.azureTypeName',
        {
          defaultMessage: 'Azure',
        }
      ),
      [REPOSITORY_TYPES.gcs]: i18n.translate('xpack.snapshotRestore.repositoryType.gcsTypeName', {
        defaultMessage: 'Google Cloud Storage',
      }),
      [REPOSITORY_TYPES.source]: i18n.translate(
        'xpack.snapshotRestore.repositoryType.sourceTypeName',
        {
          defaultMessage: 'Source-only',
        }
      ),
    };
    this.breadcrumbs = {
      home: i18n.translate('xpack.snapshotRestore.home.breadcrumbTitle', {
        defaultMessage: 'Snapshot and Restore',
      }),
      snapshots: i18n.translate('xpack.snapshotRestore.snapshots.breadcrumbTitle', {
        defaultMessage: 'Snapshots',
      }),
      repositories: i18n.translate('xpack.snapshotRestore.repositories.breadcrumbTitle', {
        defaultMessage: 'Repositories',
      }),
      policies: i18n.translate('xpack.snapshotRestore.policies.breadcrumbTitle', {
        defaultMessage: 'Policies',
      }),
      restore_status: i18n.translate('xpack.snapshotRestore.restoreStatus.breadcrumbTitle', {
        defaultMessage: 'Restore Status',
      }),
      repositoryAdd: i18n.translate('xpack.snapshotRestore.addRepository.breadcrumbTitle', {
        defaultMessage: 'Add repository',
      }),
      repositoryEdit: i18n.translate('xpack.snapshotRestore.editRepository.breadcrumbTitle', {
        defaultMessage: 'Edit repository',
      }),
      restoreSnapshot: i18n.translate('xpack.snapshotRestore.restoreSnapshot.breadcrumbTitle', {
        defaultMessage: 'Restore snapshot',
      }),
      policyAdd: i18n.translate('xpack.snapshotRestore.addPolicy.breadcrumbTitle', {
        defaultMessage: 'Add policy',
      }),
      policyEdit: i18n.translate('xpack.snapshotRestore.editPolicy.breadcrumbTitle', {
        defaultMessage: 'Edit policy',
      }),
    };
  }

  public getRepositoryTypeName(type: string, delegateType?: string) {
    const getTypeName = (repositoryType: string): string => {
      return this.repositoryTypeNames[repositoryType] || type || '';
    };

    if (type === REPOSITORY_TYPES.source && delegateType) {
      return this.i18n.translate(
        'xpack.snapshotRestore.repositoryType.sourceTypeWithDelegateName',
        {
          defaultMessage: '{delegateType} (Source-only)',
          values: {
            delegateType: getTypeName(delegateType),
          },
        }
      );
    }

    return getTypeName(type);
  }

  public getSizeNotationHelpText() {
    return this.i18n.translate('xpack.snapshotRestore.repositoryForm.sizeNotationPlaceholder', {
      defaultMessage: 'Examples: {example1}, {example2}, {example3}, {example4}',
      values: {
        example1: '1g',
        example2: '10mb',
        example3: '5k',
        example4: '1024B',
      },
    });
  }

  public getTimeUnitLabel(timeUnit: 'd' | 'h' | 'm' | 's', timeValue: string) {
    switch (timeUnit) {
      case TIME_UNITS.SECOND:
        return this.i18n.translate('xpack.snapshotRestore.policyForm.timeUnits.secondLabel', {
          defaultMessage: '{timeValue, plural, one {second} other {seconds}}',
          values: { timeValue },
        });
      case TIME_UNITS.MINUTE:
        return this.i18n.translate('xpack.snapshotRestore.policyForm.timeUnits.minuteLabel', {
          defaultMessage: '{timeValue, plural, one {minute} other {minutes}}',
          values: { timeValue },
        });
      case TIME_UNITS.HOUR:
        return this.i18n.translate('xpack.snapshotRestore.policyForm.timeUnits.hourLabel', {
          defaultMessage: '{timeValue, plural, one {hour} other {hours}}',
          values: { timeValue },
        });
      case TIME_UNITS.DAY:
        return this.i18n.translate('xpack.snapshotRestore.policyForm.timeUnits.dayLabel', {
          defaultMessage: '{timeValue, plural, one {day} other {days}}',
          values: { timeValue },
        });
    }
  }
}

export const textService = new TextService();
