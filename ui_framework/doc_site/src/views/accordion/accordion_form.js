import React from 'react';

import {
  KuiAccordion,
  KuiText,
  KuiTextColor,
  KuiForm,
  KuiFormRow,
  KuiFieldText,
  KuiFieldPassword,
  KuiIcon,
  KuiTextArea,
  KuiSpacer,
  KuiFlexGroup,
  KuiFlexItem,
  KuiTitle,
  KuiButtonIcon,
} from '../../../../components';

function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

const repeatableForm = (
  <KuiForm>
    <KuiFlexGroup>
      <KuiFlexItem>
        <KuiFormRow label="Username"  id={makeId()}>
          <KuiFieldText icon="user" placeholder="John" />
        </KuiFormRow>
      </KuiFlexItem>
      <KuiFlexItem>
        <KuiFormRow label="Password" id={makeId()} helpText="Must include one number and one symbol">
          <KuiFieldPassword icon="lock" />
        </KuiFormRow>
      </KuiFlexItem>
    </KuiFlexGroup>
    <KuiSpacer size="m" />
    <KuiFormRow label="Body" id={makeId()}>
      <KuiTextArea placeholder="I am a textarea, put some content in me!" />
    </KuiFormRow>
  </KuiForm>
);

const buttonContent = (
  <div>
    <KuiFlexGroup gutterSize="small">
      <KuiFlexItem grow={false}>
        <KuiIcon type="logoWebhook" size="medium" />
      </KuiFlexItem>
      <KuiFlexItem>
        <KuiTitle size="small" className="kuiAccordionForm__title">
          <h6>Webhook</h6>
        </KuiTitle>
      </KuiFlexItem>
    </KuiFlexGroup>
    <KuiText size="s">
      <p>
        <KuiTextColor color="subdued">
          Will send a POST request to www.example.com/some/path/
        </KuiTextColor>
      </p>
    </KuiText>
  </div>
);

const extraAction = (
  <KuiButtonIcon iconType="cross" type="danger" className="kuiAccordionForm__extraAction" />
);

export default () => (
  <div>
    <KuiTitle size="small">
      <h3>I am a complicated, highly styled, repeatable form!</h3>
    </KuiTitle>
    <KuiSpacer size="l" />
    <KuiAccordion
      className="kuiAccordionForm"
      buttonClassName="kuiAccordionForm__button"
      buttonContent={buttonContent}
      extraAction={extraAction}
    >
      <div className="kuiAccordionForm__children">
        {repeatableForm}
      </div>
    </KuiAccordion>
    <KuiAccordion
      className="kuiAccordionForm"
      buttonClassName="kuiAccordionForm__button"
      buttonContent={buttonContent}
      extraAction={extraAction}
    >
      <div className="kuiAccordionForm__children">
        {repeatableForm}
      </div>
    </KuiAccordion>
  </div>
);
