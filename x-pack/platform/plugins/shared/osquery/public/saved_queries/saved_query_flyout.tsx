/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlyout,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiPortal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  useEuiTheme,
} from '@elastic/eui';
import { FormProvider } from 'react-hook-form';

import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { SavedQuerySOFormData, SavedQueryFormData } from './form/use_saved_query_form';
import { useSavedQueryForm } from './form/use_saved_query_form';
import { SavedQueryForm } from './form';
import { useCreateSavedQuery } from './use_create_saved_query';

interface AddQueryFlyoutProps {
  defaultValue: SavedQuerySOFormData;
  onClose: () => void;
}

const SavedQueryFlyoutComponent: React.FC<AddQueryFlyoutProps> = ({ defaultValue, onClose }) => {
  const createSavedQueryMutation = useCreateSavedQuery({ withRedirect: false });

  const hooksForm = useSavedQueryForm({
    defaultValue,
  });
  const {
    serializer,
    idSet,
    handleSubmit,
    formState: { isSubmitting },
  } = hooksForm;
  const onSubmit = useCallback(
    async (payload: SavedQueryFormData) => {
      const serializedData = serializer(payload);
      await createSavedQueryMutation.mutateAsync(serializedData).then(() => onClose());
    },
    [createSavedQueryMutation, onClose, serializer]
  );
  const { euiTheme } = useEuiTheme();

  // we need this flyout to be above the timeline flyout (which has a z-index of 1002)
  const maskProps = useMemo(
    () => ({ style: `z-index: ${(euiTheme.levels.flyout as number) + 3}` }),
    [euiTheme.levels.flyout]
  );

  return (
    <EuiPortal>
      <EuiFlyout
        data-test-subj={'osquery-save-query-flyout'}
        size="m"
        ownFocus
        onClose={onClose}
        aria-labelledby="flyoutTitle"
        maskProps={maskProps}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id="flyoutTitle">
              <FormattedMessage
                id="xpack.osquery.savedQuery.saveQueryFlyoutForm.addFormTitle"
                defaultMessage="Save query"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <FormProvider {...hooksForm}>
            <SavedQueryForm idSet={idSet} />
          </FormProvider>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
                <FormattedMessage
                  id="xpack.osquery.pack.queryFlyoutForm.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="savedQueryFlyoutSaveButton"
                isLoading={isSubmitting}
                onClick={handleSubmit(onSubmit)}
                fill
              >
                <FormattedMessage
                  id="xpack.osquery.pack.queryFlyoutForm.saveButtonLabel"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
};

export const SavedQueryFlyout = React.memo(SavedQueryFlyoutComponent);
