/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLiveAnnouncer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { FieldsListItemContainer } from './fields_list_item_container';
import type { NormalizedField, State } from '../../../types';
import { useLiveAnnouncement } from '../use_live_announcement';

interface Props {
  fields?: NormalizedField[];
  treeDepth?: number;
  state: State;
  setPreviousState?: (state: State) => void;
  isAddingFields?: boolean;
  pendingFieldsRef?: React.RefObject<HTMLDivElement>;
}

export const FieldsList = React.memo(function FieldsListComponent({
  fields,
  treeDepth,
  state,
  setPreviousState,
  isAddingFields,
  pendingFieldsRef,
}: Props) {
  const listLabel = i18n.translate('xpack.idxMgmt.mappingsEditor.fieldListLabel', {
    defaultMessage: 'Saved mapping fields',
  });

  const fieldsKey = useMemo(() => fields?.map((field) => field.id).join('|') ?? '', [fields]);
  const itemsCount = fields?.length ?? 0;

  const message = i18n.translate(
    'xpack.idxMgmt.mappingsEditor.fieldListUpdatedAnnouncementWithCount',
    {
      defaultMessage:
        '{listLabel} list has been updated. {itemsCount, plural, one {# item} other {# items}}.',
      values: { listLabel, itemsCount },
    }
  );
  const liveAnnouncement = useLiveAnnouncement({ message, changeKey: fieldsKey });

  if (fields === undefined) {
    return null;
  }

  return (
    <>
      <EuiLiveAnnouncer>{liveAnnouncement}</EuiLiveAnnouncer>
      <ul data-test-subj="fieldsList" aria-label={listLabel}>
        {fields.map((field, index) => (
          <FieldsListItemContainer
            key={field.id}
            fieldId={field.id}
            treeDepth={treeDepth === undefined ? 0 : treeDepth}
            isLastItem={index === fields.length - 1}
            state={state}
            setPreviousState={setPreviousState}
            isAddingFields={isAddingFields}
            pendingFieldsRef={pendingFieldsRef}
          />
        ))}
      </ul>
    </>
  );
});
