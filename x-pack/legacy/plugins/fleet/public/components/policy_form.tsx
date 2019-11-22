/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC, useState } from 'react';
import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiTitle,
  EuiDescriptionList,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Policy } from '../../scripts/mock_spec/types';

interface Props {
  policy: Partial<Policy>;
  onCancel: () => void;
  onSubmit: (newPolicy: Policy) => void;
}

export const PolicyForm: SFC<Props> = ({ policy: originalPolicy, onCancel, onSubmit }) => {
  const [policy, setPolicy] = useState<Partial<Policy>>({ ...originalPolicy });
  const updatePolicy = (updatedFields: Partial<Policy>) => {
    setPolicy({
      ...policy,
      ...updatedFields,
    });
  };

  // TODO: Replace with real policy meta
  const [meta, setMeta] = useState<{ [key: string]: string }>(
    originalPolicy.id
      ? {
          env: 'test',
          region: 'us-east',
        }
      : {}
  );
  const [addedMeta, setAddedMeta] = useState<string[][]>([]);

  return (
    <EuiForm>
      {/* Name */}
      <EuiFormRow
        label={
          <FormattedMessage id="xpack.fleet.policyForm.nameFieldLabel" defaultMessage="Name" />
        }
      >
        <EuiFieldText value={policy.name} onChange={e => updatePolicy({ name: e.target.value })} />
      </EuiFormRow>

      {/* Description */}
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.fleet.policyForm.descriptionFieldLabel"
            defaultMessage="Description"
          />
        }
      >
        <EuiFieldText
          value={policy.description}
          onChange={e => updatePolicy({ description: e.target.value })}
        />
      </EuiFormRow>

      <EuiHorizontalRule />

      {/* Meta */}
      <EuiTitle size="s">
        <h4>
          <FormattedMessage id="xpack.fleet.policyForm.metaFieldLabel" defaultMessage="Meta" />
        </h4>
      </EuiTitle>
      {Object.keys(meta).length ? <EuiSpacer size="m" /> : null}
      {Object.keys(meta).length ? (
        <EuiDescriptionList
          type="responsiveColumn"
          listItems={Object.entries(meta).map(([key, value]) => ({
            title: key,
            description: (
              <EuiFlexGroup>
                <EuiFlexItem>{value}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="minusInCircle"
                    color="danger"
                    onClick={() => {
                      const newMeta = { ...meta };
                      delete newMeta[key];
                      setMeta(newMeta);
                    }}
                    aria-label={i18n.translate(
                      'xpack.fleet.policyForm.removeMetaIconButtonAriaLabel',
                      {
                        defaultMessage: 'Remove meta field',
                      }
                    )}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
          }))}
        />
      ) : null}
      {addedMeta.length ? <EuiSpacer size="m" /> : null}
      {addedMeta.length
        ? addedMeta.map(([key, value], i) => (
            <EuiFlexGroup alignItems="center" key={i} gutterSize="s">
              <EuiFlexItem grow={4}>
                <EuiFieldText
                  value={key}
                  onChange={e => {
                    const newAddedMeta = JSON.parse(JSON.stringify(addedMeta));
                    newAddedMeta[i][0] = e.target.value;
                    setAddedMeta(newAddedMeta);
                  }}
                  placeholder={i18n.translate('xpack.fleet.policyForm.addMetaKeyFieldPlaceholder', {
                    defaultMessage: 'key',
                  })}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={6}>
                <EuiFieldText
                  value={value}
                  onChange={e => {
                    const newAddedMeta = JSON.parse(JSON.stringify(addedMeta));
                    newAddedMeta[i][1] = e.target.value;
                    setAddedMeta(newAddedMeta);
                  }}
                  placeholder={i18n.translate(
                    'xpack.fleet.policyForm.addMetaValueFieldPlaceholder',
                    {
                      defaultMessage: 'value',
                    }
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="checkInCircleFilled"
                      color="primary"
                      disabled={!key || !value || Boolean(meta[key])}
                      onClick={() => {
                        const newAddedMeta = JSON.parse(JSON.stringify(addedMeta));
                        newAddedMeta.splice(i, 1);
                        setAddedMeta(newAddedMeta);
                        setMeta({
                          ...meta,
                          [key]: value,
                        });
                      }}
                      aria-label={i18n.translate(
                        'xpack.fleet.policyForm.addMetaIconButtonAriaLabel',
                        {
                          defaultMessage: 'Add meta field',
                        }
                      )}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="minusInCircle"
                      color="danger"
                      onClick={() => {
                        const newAddedMeta = JSON.parse(JSON.stringify(addedMeta));
                        newAddedMeta.splice(i, 1);
                        setAddedMeta(newAddedMeta);
                      }}
                      aria-label={i18n.translate(
                        'xpack.fleet.policyForm.removeMetaIconButtonAriaLabel',
                        {
                          defaultMessage: 'Remove meta field',
                        }
                      )}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))
        : null}
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        onClick={() => setAddedMeta([...addedMeta, ['', '']])}
        iconType="plusInCircle"
        flush="left"
      >
        <FormattedMessage
          id="xpack.fleet.policyForm.addMetaFieldButtonLabel"
          defaultMessage="Add meta field"
        />
      </EuiButtonEmpty>
    </EuiForm>
  );
};
