/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { get, every, some } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiSearchBar } from '@elastic/eui';
import type { ApplicationStart } from '@kbn/core/public';

import type { Index, IndexManagementPluginSetup } from '@kbn/index-management-plugin/public';

import { retryLifecycleForIndex } from '../application/services/api';
import { indexLifecycleTab } from './components/index_lifecycle_summary';

import { AddLifecyclePolicyConfirmModal } from './components/add_lifecycle_confirm_modal';
import { RemoveLifecyclePolicyConfirmModal } from './components/remove_lifecycle_confirm_modal';

const stepPath = 'ilm.step';

export const retryLifecycleActionExtension = ({ indices }: { indices: Index[] }) => {
  const indicesWithFailedStep = indices.filter((index) => {
    return index.ilm?.managed && index.ilm.failed_step;
  });
  if (!indicesWithFailedStep.length) {
    return null;
  }
  const indexNames = indicesWithFailedStep.map(({ name }: Index) => name);
  return {
    requestMethod: retryLifecycleForIndex,
    icon: 'play',
    indexNames: [indexNames],
    buttonLabel: i18n.translate('xpack.indexLifecycleMgmt.retryIndexLifecycleActionButtonLabel', {
      defaultMessage: 'Retry failed lifecycle step',
    }),
    successMessage: i18n.translate(
      'xpack.indexLifecycleMgmt.retryIndexLifecycleAction.retriedLifecycleMessage',
      {
        defaultMessage: 'Called retry lifecycle step for: {indexNames}',
        values: { indexNames: indexNames.map((indexName: string) => `"${indexName}"`).join(', ') },
      }
    ),
  };
};

export const removeLifecyclePolicyActionExtension = ({
  indices,
  reloadIndices,
}: {
  indices: Index[];
  reloadIndices: () => void;
}) => {
  const allHaveIlm = every(indices, (index) => {
    return index.ilm && index.ilm.managed;
  });
  if (!allHaveIlm) {
    return null;
  }
  const indexNames = indices.map(({ name }: Index) => name);
  return {
    renderConfirmModal: (closeModal: () => void) => {
      return (
        <RemoveLifecyclePolicyConfirmModal
          indexNames={indexNames}
          closeModal={closeModal}
          reloadIndices={reloadIndices}
        />
      );
    },
    icon: 'stopFilled',
    indexNames: [indexNames],
    buttonLabel: i18n.translate('xpack.indexLifecycleMgmt.removeIndexLifecycleActionButtonLabel', {
      defaultMessage: 'Remove lifecycle policy',
    }),
  };
};

export const addLifecyclePolicyActionExtension = ({
  indices,
  reloadIndices,
  getUrlForApp,
}: {
  indices: Index[];
  reloadIndices: () => void;
  getUrlForApp: ApplicationStart['getUrlForApp'];
}) => {
  if (indices.length !== 1) {
    return null;
  }
  const index = indices[0];
  const hasIlm = index.ilm && index.ilm.managed;

  if (hasIlm) {
    return null;
  }
  const indexName = index.name;
  return {
    renderConfirmModal: (closeModal: () => void) => {
      return (
        <AddLifecyclePolicyConfirmModal
          indexName={indexName}
          closeModal={closeModal}
          index={index}
          reloadIndices={reloadIndices}
          getUrlForApp={getUrlForApp}
        />
      );
    },
    icon: 'plusInCircle',
    buttonLabel: i18n.translate('xpack.indexLifecycleMgmt.addLifecyclePolicyActionButtonLabel', {
      defaultMessage: 'Add lifecycle policy',
    }),
  };
};

export const ilmBannerExtension = (indices: Index[]) => {
  const { Query } = EuiSearchBar;
  if (!indices.length) {
    return null;
  }
  const indicesWithLifecycleErrors = indices.filter((index: Index) => {
    return get(index, stepPath) === 'ERROR';
  });
  const numIndicesWithLifecycleErrors = indicesWithLifecycleErrors.length;
  if (!numIndicesWithLifecycleErrors) {
    return null;
  }

  const retryAction = retryLifecycleActionExtension({ indices: indicesWithLifecycleErrors });

  return {
    type: 'warning',
    filter: Query.parse(`${stepPath}:ERROR`),
    filterLabel: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtBanner.filterLabel', {
      defaultMessage: 'Show errors',
    }),
    // retryAction can be set to null if the retry action is not applicable to all the indices with lifecycle errors
    ...(retryAction && {
      action: {
        buttonLabel: retryAction.buttonLabel,
        indexNames: retryAction.indexNames?.[0] ?? [],
        requestMethod: retryAction.requestMethod,
        successMessage: retryAction.successMessage,
      },
    }),
    title: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtBanner.errorMessage', {
      defaultMessage: `{ numIndicesWithLifecycleErrors, number}
          {numIndicesWithLifecycleErrors, plural, one {index has} other {indices have} }
          lifecycle errors`,
      values: { numIndicesWithLifecycleErrors },
    }),
  };
};

export const ilmFilterExtension = (indices: Index[]) => {
  const hasIlm = some(indices, (index) => index.ilm && index.ilm.managed);
  if (!hasIlm) {
    return [];
  } else {
    return [
      {
        type: 'field_value_selection',
        name: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.lifecycleStatusLabel', {
          defaultMessage: 'Lifecycle status',
        }),
        multiSelect: false,
        field: 'ilm.managed',
        options: [
          {
            value: true,
            name: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.managedLabel', {
              defaultMessage: 'Managed',
            }),
          },
          {
            value: false,
            name: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.unmanagedLabel', {
              defaultMessage: 'Unmanaged',
            }),
          },
        ],
      },
      {
        type: 'field_value_selection',
        field: 'ilm.phase',
        name: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.lifecyclePhaseLabel', {
          defaultMessage: 'Lifecycle phase',
        }),
        multiSelect: 'or',
        autoSortOptions: false,
        options: [
          {
            value: 'hot',
            view: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.hotLabel', {
              defaultMessage: 'Hot',
            }),
          },
          {
            value: 'warm',
            view: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.warmLabel', {
              defaultMessage: 'Warm',
            }),
          },
          {
            value: 'frozen',
            view: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.frozenLabel', {
              defaultMessage: 'Frozen',
            }),
          },
          {
            value: 'cold',
            view: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.coldLabel', {
              defaultMessage: 'Cold',
            }),
          },
          {
            value: 'delete',
            view: i18n.translate('xpack.indexLifecycleMgmt.indexMgmtFilter.deleteLabel', {
              defaultMessage: 'Delete',
            }),
          },
        ],
      },
    ];
  }
};

export const addAllExtensions = (
  extensionsService: IndexManagementPluginSetup['extensionsService']
) => {
  extensionsService.addAction(retryLifecycleActionExtension);
  extensionsService.addAction(removeLifecyclePolicyActionExtension);
  extensionsService.addAction(addLifecyclePolicyActionExtension);

  extensionsService.addBanner(ilmBannerExtension);
  extensionsService.addFilter(ilmFilterExtension);

  extensionsService.addIndexDetailsTab(indexLifecycleTab);
};
