import React from 'react';

import {
  KuiCheckbox,
  KuiFieldNumber,
  KuiFieldPassword,
  KuiFieldSearch,
  KuiFieldText,
  KuiRange,
  KuiSelect,
  KuiSwitch,
  KuiTextArea,
} from '../../../../components';

export default () => (
  <div>
    <KuiFieldText placeholder="Placeholder text" />

    <br />
    <br />

    <KuiFieldText
      defaultValue="Text field with customizable icon"
      icon="user"
    />

    <br />
    <br />

    <KuiFieldNumber defaultValue="23" />

    <br />
    <br />

    <KuiFieldNumber
      defaultValue="23"
      icon="user"
    />

    <br />
    <br />

    <KuiFieldPassword defaultValue="password" />

    <br />
    <br />

    <KuiFieldSearch defaultValue="Search field" />

    <br />
    <br />

    <KuiTextArea />

    <br />
    <br />

    <KuiSelect
      options={[
        { value: 'option_one', text: 'Option one' },
        { value: 'option_two', text: 'Option two' },
        { value: 'option_three', text: 'Option three' },
      ]}
    />

    <br />
    <br />

    <KuiRange />

    <br />
    <br />

    <KuiSwitch />

    <br />
    <br />

    <KuiCheckbox
      options={[
        { id: '0', label: 'Option one', onChange: () => {} },
        { id: '1', label: 'Option two is checked by default', checked: true, onChange: () => {} },
        { id: '2', label: 'Option three', onChange: () => {} },
      ]}
    />
  </div>
);
