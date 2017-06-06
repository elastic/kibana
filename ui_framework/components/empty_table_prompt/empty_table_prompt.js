import React from 'react';
import classnames from 'classnames';

import { KuiButtonIcon, KuiLinkButton } from '../button';
import { KuiEmptyTablePromptMessage } from  './empty_table_prompt_message';

export function KuiEmptyTablePrompt({ itemType, promptMessage, promptButtonText, addHref, className, ...rest }) {
  const classes = classnames('kuiEmptyTablePrompt', className);
  return (
    <div className={classes} {...rest} >
      <KuiEmptyTablePromptMessage>
        {promptMessage}
      </KuiEmptyTablePromptMessage>

      <div className="kuiEmptyTablePrompt__actions">
        <KuiLinkButton
          icon={<KuiButtonIcon type="create" />}
          aria-label={`Add a new ${itemType}`}
          className="testClass1 testClass2"
          data-test-subj={`addNewPromptButton`}
          buttonType="primary"
          href={addHref}
        >
          {promptButtonText}
        </KuiLinkButton>
      </div>
    </div>
  );
}

KuiEmptyTablePrompt.propTypes = {
  itemType: React.PropTypes.string.isRequired,
  promptMessage: React.PropTypes.string.isRequired,
  promptButtonText: React.PropTypes.string.isRequired,
  addHref: React.PropTypes.string.isRequired,
  className: React.PropTypes.string,
};
