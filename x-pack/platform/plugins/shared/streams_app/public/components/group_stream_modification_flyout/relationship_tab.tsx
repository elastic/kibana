/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { TabProps } from './types';

export function RelationshipsTab({
  formData,
  setFormData,
  availableStreams,
}: TabProps & { availableStreams: EuiComboBoxOptionOption[] }) {
  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.groupStreamModificationFlyout.parentRelationshipLabel',
          {
            defaultMessage: 'Parent',
          }
        )}
      >
        <EuiComboBox
          placeholder={i18n.translate(
            'xpack.streams.groupStreamModificationFlyout.parentRelationshipPlaceholder',
            {
              defaultMessage: 'Select parent',
            }
          )}
          options={availableStreams}
          singleSelection={true}
          selectedOptions={formData.parent}
          onChange={(options) => {
            setFormData({ ...formData, parent: options });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.groupStreamModificationFlyout.childrenRelationshipsLabel',
          {
            defaultMessage: 'Children',
          }
        )}
      >
        <EuiComboBox
          placeholder={i18n.translate(
            'xpack.streams.groupStreamModificationFlyout.childrenRelationshipsPlaceholder',
            {
              defaultMessage: 'Select children',
            }
          )}
          options={availableStreams}
          selectedOptions={formData.child}
          onChange={(options) => {
            setFormData({ ...formData, child: options });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.groupStreamModificationFlyout.dependencyRelationshipsLabel',
          {
            defaultMessage: 'Dependencies',
          }
        )}
      >
        <EuiComboBox
          placeholder={i18n.translate(
            'xpack.streams.groupStreamModificationFlyout.dependencyRelationshipsPlaceholder',
            {
              defaultMessage: 'Select dependencies',
            }
          )}
          options={availableStreams}
          selectedOptions={formData.dependency}
          onChange={(options) => {
            setFormData({ ...formData, dependency: options });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.streams.groupStreamModificationFlyout.relationshipsLabel', {
          defaultMessage: 'Other relationships',
        })}
      >
        <EuiComboBox
          placeholder={i18n.translate(
            'xpack.streams.groupStreamModificationFlyout.relationshipsPlaceholder',
            {
              defaultMessage: 'Select related streams',
            }
          )}
          options={availableStreams}
          selectedOptions={formData.related}
          onChange={(options) => {
            setFormData({ ...formData, related: options });
          }}
        />
      </EuiFormRow>
    </>
  );
}
