import React from 'react';

import {
  KuiForm,
  KuiFormCheckbox,
  KuiFormRadio,
  KuiFormRow,
  KuiFormSearch,
  KuiFormSelect,
  KuiFormSwitch,
  KuiFormText,
  KuiFormTextarea,
} from '../../../../components';

export default () => (
  <KuiForm>
    <KuiFormRow>
      <KuiFormCheckbox />
    </KuiFormRow>
    <KuiFormRow>
      <KuiFormRadio />
    </KuiFormRow>
    <KuiFormRow>
      <KuiFormSearch />
    </KuiFormRow>
    <KuiFormRow>
      <KuiFormSelect />
    </KuiFormRow>
    <KuiFormRow>
      <KuiFormSwitch />
    </KuiFormRow>
    <KuiFormRow label="Text example">
      <KuiFormText />
    </KuiFormRow>
    <KuiFormRow>
      <KuiFormTextarea />
    </KuiFormRow>
  </KuiForm>
);
