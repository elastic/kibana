import React from 'react';

import {
  KuiCard,
  KuiCardDescription,
  KuiCardDescriptionTitle,
  KuiCardDescriptionText,
  KuiCardFooter,
  KuiLinkButton
} from '../../../../components';

export default () => {
  return (
    <KuiCard>
      <KuiCardDescription>
        <KuiCardDescriptionTitle>
          Get a banana
        </KuiCardDescriptionTitle>

        <KuiCardDescriptionText>
          Bananas are yellow, fit easily in the hand, and have a lot of potassium or something.
        </KuiCardDescriptionText>
      </KuiCardDescription>

      <KuiCardFooter>
        <KuiLinkButton
          buttonType="basic"
          href="#"
        >
          Banana!
        </KuiLinkButton>
      </KuiCardFooter>
    </KuiCard>
  );
};
