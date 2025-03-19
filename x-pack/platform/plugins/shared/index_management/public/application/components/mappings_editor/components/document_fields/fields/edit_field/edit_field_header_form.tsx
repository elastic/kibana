/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { FormDataProvider } from '../../../../shared_imports';
import { MainType, SubType, Field, DataTypeDefinition } from '../../../../types';
import { TYPE_DEFINITION } from '../../../../constants';
import { NameParameter, TypeParameter, SubTypeParameter } from '../../field_parameters';
import { FieldBetaBadge } from '../field_beta_badge';
import { FieldDescriptionSection } from './field_description_section';

interface Props {
  defaultValue: Field;
  isRootLevelField: boolean;
  isMultiField: boolean;
}

const getTypeDefinition = (type: MainType, subType: SubType): DataTypeDefinition | undefined => {
  if (!type) {
    return;
  }

  const typeDefinition = TYPE_DEFINITION[type];
  const hasSubType = typeDefinition.subTypes !== undefined;

  if (hasSubType) {
    if (subType) {
      return TYPE_DEFINITION[subType];
    }

    return;
  }

  return typeDefinition;
};

export const EditFieldHeaderForm = React.memo(
  ({ defaultValue, isRootLevelField, isMultiField }: Props) => {
    return (
      <>
        <EuiFlexGroup gutterSize="s">
          {/* Field name */}
          <EuiFlexItem>
            <NameParameter />
          </EuiFlexItem>

          {/* Field type */}
          <EuiFlexItem>
            <TypeParameter isRootLevelField={isRootLevelField} isMultiField={isMultiField} />
          </EuiFlexItem>

          {/* Field subType (if any) */}
          <FormDataProvider pathsToWatch="type">
            {({ type }) => {
              if (type === undefined) {
                return null;
              }

              const [fieldType] = type;
              return (
                <SubTypeParameter
                  key={fieldType?.value}
                  type={fieldType?.value}
                  defaultValueType={defaultValue.type}
                  isMultiField={isMultiField}
                  isRootLevelField={isRootLevelField}
                />
              );
            }}
          </FormDataProvider>
        </EuiFlexGroup>

        {/* Field description */}
        <FormDataProvider pathsToWatch={['type', 'subType']}>
          {({ type, subType }) => {
            const typeDefinition = getTypeDefinition(
              type[0]?.value as MainType,
              subType && (subType[0]?.value as SubType)
            );
            const description = (typeDefinition?.description?.() as JSX.Element) ?? null;

            return (
              <>
                <EuiSpacer size="l" />

                {typeDefinition?.isBeta && <FieldBetaBadge />}

                <EuiSpacer size="s" />

                <FieldDescriptionSection isMultiField={isMultiField}>
                  {description}
                </FieldDescriptionSection>
              </>
            );
          }}
        </FormDataProvider>
      </>
    );
  }
);
