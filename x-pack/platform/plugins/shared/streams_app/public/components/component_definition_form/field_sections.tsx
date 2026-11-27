/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  CatalogueChoiceGroup,
  CatalogueFieldGroup,
  CatalogueNamedFieldDefinition,
} from '@kbn/streams-schema';
import { toControlId } from './field_helpers';
import { FieldList } from './field_list';
import { useDefinitionFormContext } from './form_context';
import { layoutSections } from './layout';
import { errorsUnder, joinPointer, type ObjectValue } from './values';

const groupBodyStyles = ({ euiTheme }: UseEuiTheme) => css`
  border-left: ${euiTheme.border.thin};
  margin-left: ${euiTheme.size.m};
  padding-top: ${euiTheme.size.m};
  padding-left: calc(${euiTheme.size.m} + ${euiTheme.size.xs});
`;

function FieldGroup({
  group,
  id,
  hasErrors,
  children,
}: {
  group: CatalogueFieldGroup;
  id: string;
  hasErrors: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(!group.advanced || hasErrors);
  useEffect(() => {
    if (hasErrors) {
      setIsOpen(true);
    }
  }, [hasErrors]);

  return (
    <EuiAccordion
      id={id}
      element="fieldset"
      paddingSize="none"
      buttonContent={group.label}
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={setIsOpen}
      data-test-subj={`componentDefinitionFormGroup-${group.id}`}
    >
      <div css={groupBodyStyles}>
        {group.description ? (
          <>
            <EuiText size="xs" color="subdued">
              <p>{group.description}</p>
            </EuiText>
            <EuiSpacer size="m" />
          </>
        ) : null}
        {children}
      </div>
    </EuiAccordion>
  );
}

interface FieldSectionsProps {
  fields: readonly CatalogueNamedFieldDefinition[];
  choiceGroups?: readonly CatalogueChoiceGroup[];
  value: ObjectValue;
  onChange: (value: ObjectValue) => void;
  pointer: string;
}

export function FieldSections({
  fields,
  choiceGroups,
  value,
  onChange,
  pointer,
}: FieldSectionsProps) {
  const { groups, errors, idPrefix } = useDefinitionFormContext();
  const sections = useMemo(() => layoutSections(fields, groups), [fields, groups]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {sections.map(({ group, fields: sectionFields }) => {
        const list = (
          <FieldList
            fields={sectionFields}
            choiceGroups={choiceGroups}
            value={value}
            onChange={onChange}
            pointer={pointer}
          />
        );
        return (
          <EuiFlexItem key={group ? `group:${group.id}` : 'ungrouped'} grow={false}>
            {group ? (
              <FieldGroup
                group={group}
                // The same group can show in every item of a list, so the pointer is part of the id.
                id={toControlId(`${idPrefix}-group-${group.id}`, pointer)}
                hasErrors={sectionFields.some(({ name }) =>
                  errorsUnder(errors, joinPointer(pointer, name))
                )}
              >
                {list}
              </FieldGroup>
            ) : (
              list
            )}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
