import React from 'react';
import classnames from 'classnames';

import { KuiButtonIcon, KuiLinkButton } from '../button';
import { KuiPromptForItemsMessage } from  './prompt_for_items_message';

export function KuiPromptForItems({ itemType, promptMessage, promptButtonText, addHref, className, ...rest }) {
  const classes = classnames('kuiPromptForItems', className);
  return (
    <div className={classes} {...rest} >
      <KuiPromptForItemsMessage>
        {promptMessage}
      </KuiPromptForItemsMessage>

      <div className="kuiPromptForItems__actions">
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

KuiPromptForItems.propTypes = {
  itemType: React.PropTypes.string.isRequired,
  promptMessage: React.PropTypes.string.isRequired,
  promptButtonText: React.PropTypes.string.isRequired,
  addHref: React.PropTypes.string.isRequired,
  className: React.PropTypes.string,
};
