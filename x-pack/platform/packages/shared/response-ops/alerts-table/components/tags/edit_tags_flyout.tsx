/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  euiFullHeight,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';

import type { Alert } from '@kbn/alerting-types';
import { EditTagsSelectable } from './edit_tags_selectable';
import * as i18n from './translations';
import type { ItemsSelectionState } from './items/types';
import { useFocusButtonTrap } from './use_focus_button';

interface Props {
  selectedAlerts: Alert[];
  onClose: () => void;
  onSaveTags: (args: ItemsSelectionState) => void;
  focusButtonRef?: React.Ref<HTMLButtonElement>;
}

const FlyoutBodyCss = css`
  ${euiFullHeight()}

  .euiFlyoutBody__overflowContent {
    ${euiFullHeight()}
  }
`;

const EditTagsFlyoutComponent: React.FC<Props> = ({
  selectedAlerts,
  onClose,
  onSaveTags,
  focusButtonRef,
}) => {
  const tags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const alert of selectedAlerts) {
      const alertTags = alert[ALERT_WORKFLOW_TAGS] as string[] | undefined;
      if (alertTags && Array.isArray(alertTags)) {
        alertTags.forEach((tag) => tagSet.add(tag));
      }
    }
    return Array.from(tagSet).sort();
  }, [selectedAlerts]);

  const isLoading = false;

  const [tagsSelection, setTagsSelection] = useState<ItemsSelectionState>({
    selectedItems: [],
    unSelectedItems: [],
  });

  const onSave = useCallback(() => onSaveTags(tagsSelection), [onSaveTags, tagsSelection]);
  const focusTrapProps = useFocusButtonTrap(focusButtonRef);

  const headerSubtitle = i18n.SELECTED_ALERTS(selectedAlerts.length);

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="alerts-edit-tags-flyout"
      data-test-subj="alerts-edit-tags-flyout"
      size="s"
      paddingSize="m"
      focusTrapProps={focusTrapProps}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 data-test-subj="alerts-edit-tags-flyout-title">{i18n.EDIT_TAGS}</h2>
        </EuiTitle>
        <EuiText color="subdued">
          <p>{headerSubtitle}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={FlyoutBodyCss}>
        <EditTagsSelectable
          selectedAlerts={selectedAlerts}
          isLoading={isLoading}
          tags={tags ?? []}
          onChangeTags={setTagsSelection}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              flush="left"
              data-test-subj="alerts-edit-tags-flyout-cancel"
            >
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onSave} fill data-test-subj="alerts-edit-tags-flyout-submit">
              {i18n.SAVE_SELECTION}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

EditTagsFlyoutComponent.displayName = 'EditTagsFlyout';

export const EditTagsFlyout = React.memo(EditTagsFlyoutComponent);
