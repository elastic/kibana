import React from 'react';

import {
  KuiKeyboardAccessible,
} from '../../../../components';

// For custom components, we just need to make sure they delegate props to their rendered root
// element, e.g. onClick, tabIndex, and role.
const CustomComponent = ({
  children,
  ...rest,
}) => (
  <div {...rest}>
    {children}
  </div>
);

export default () => (
  <div>
    <KuiKeyboardAccessible>
      <div onClick={() => window.alert('Div clicked')}>
        Click this div
      </div>
    </KuiKeyboardAccessible>

    <KuiKeyboardAccessible>
      <a
        className="kuiLink"
        onClick={() => window.alert('Anchor tag clicked')}
      >
        Click this anchor tag
      </a>
    </KuiKeyboardAccessible>

    <KuiKeyboardAccessible>
      <CustomComponent onClick={() => window.alert('Custom component clicked')}>
        Click this custom component
      </CustomComponent>
    </KuiKeyboardAccessible>

    <KuiKeyboardAccessible>
      <div onClick={() => window.alert('Div clicked')}>
        Click this div, which itself contains another acessible element:&nbsp;

        <KuiKeyboardAccessible>
          <a
            className="kuiLink"
            onClick={() => window.alert('Anchor tag clicked')}
          >
            Click this nested anchor tag
          </a>
        </KuiKeyboardAccessible>
      </div>
    </KuiKeyboardAccessible>
  </div>
);
