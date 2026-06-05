/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { CaseUI } from '../../../../common';
import { resolveUnifiedAttachmentType } from '../../../../common/utils/attachments/migration_utils';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCasesFeatures } from '../../../common/use_cases_features';
import type { MultiSelectFilterOption } from '../../all_cases/multi_select_filter';
import { MultiSelectFilter } from '../../all_cases/multi_select_filter';
import { OBSERVABLES_FILTER_ID } from './case_view_observables';
import * as i18n from './translations';

export const ATTACHMENT_TYPE_FILTER_ID = 'attachmentType';

interface AttachmentTypeFilterProps {
  caseData: CaseUI;
  isLoading?: boolean;
  selectedAttachmentTypes: string[];
  onAttachmentTypesChange: (selectedAttachmentTypes: string[]) => void;
  /**
   * Type ids to omit from the dropdown (e.g. types without a tab view in the
   * attachments tab).
   */
  excludedTypes?: readonly string[];
}

export const AttachmentTypeFilter = React.memo<AttachmentTypeFilterProps>(
  ({
    caseData,
    selectedAttachmentTypes,
    onAttachmentTypesChange,
    isLoading = false,
    excludedTypes,
  }) => {
    const { unifiedAttachmentTypeRegistry } = useCasesContext();
    const { observablesAuthorized, isObservablesFeatureEnabled } = useCasesFeatures();

    const excluded = useMemo(() => new Set(excludedTypes ?? []), [excludedTypes]);
    // TODO: derive the available types (and apply the filter) on the server so
    // we don't depend on the full comments list being present on the client.
    // Tracked by https://github.com/elastic/kibana/issues/207797.
    const availableTypes = useMemo(() => {
      const owner = Array.isArray(caseData.owner) ? caseData.owner[0] : caseData.owner;
      const types = new Set<string>();
      for (const comment of caseData.comments) {
        types.add(resolveUnifiedAttachmentType(comment, owner));
      }
      return types;
    }, [caseData.comments, caseData.owner]);

    const options = useMemo<Array<MultiSelectFilterOption<string>>>(() => {
      const registryOptions = unifiedAttachmentTypeRegistry
        .list()
        .reduce<Array<MultiSelectFilterOption<string>>>((acc, item) => {
          if (availableTypes.has(item.id) && !excluded.has(item.id)) {
            acc.push({ key: item.id, label: item.displayName });
          }
          return acc;
        }, []);

      const observablesOption =
        observablesAuthorized &&
        isObservablesFeatureEnabled &&
        caseData.observables.length > 0 &&
        !excluded.has(OBSERVABLES_FILTER_ID)
          ? [{ key: OBSERVABLES_FILTER_ID, label: i18n.OBSERVABLE }]
          : [];
      return [...registryOptions, ...observablesOption].sort((a, b) =>
        a.label.localeCompare(b.label)
      );
    }, [
      unifiedAttachmentTypeRegistry,
      availableTypes,
      observablesAuthorized,
      isObservablesFeatureEnabled,
      caseData.observables,
      excluded,
    ]);

    const onChange = useCallback(
      ({ selectedOptionKeys }: { filterId: string; selectedOptionKeys: string[] }) => {
        onAttachmentTypesChange(selectedOptionKeys);
      },
      [onAttachmentTypesChange]
    );

    return (
      <MultiSelectFilter
        id={ATTACHMENT_TYPE_FILTER_ID}
        buttonLabel={i18n.TYPE}
        onChange={onChange}
        options={options}
        selectedOptionKeys={selectedAttachmentTypes}
        isLoading={isLoading}
      />
    );
  }
);

AttachmentTypeFilter.displayName = 'AttachmentTypeFilter';
