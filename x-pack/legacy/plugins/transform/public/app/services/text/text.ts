/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
class TextService {
  public breadcrumbs: { [key: string]: string } = {};
  public i18n: any;

  public init(i18n: any): void {
    this.i18n = i18n;
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
}

export const textService = new TextService();
