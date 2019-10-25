/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { NormalizedField } from '../../../../types';
import { EditFieldSection, EditFieldFormRow } from '../edit_field';

interface Props {
  field: NormalizedField;
}

export const TextType = React.memo(({ field }: Props) => {
  return (
    <>
      <EditFieldSection>
        <EditFieldFormRow
          title={<h3>Store field value</h3>}
          description="This is description text."
          formFieldPath="store"
        />

        <EditFieldFormRow
          title={<h3>Searchable</h3>}
          description="This is description text."
          formFieldPath="index"
          direction="column"
        >
          Index option drop down here...
        </EditFieldFormRow>

        <EditFieldFormRow
          title={<h3>Fielddata</h3>}
          description="This is description text."
          formFieldPath="fielddata"
          direction="column"
        >
          Field data frequency filter component here...
        </EditFieldFormRow>
      </EditFieldSection>
    </>
  );
});
