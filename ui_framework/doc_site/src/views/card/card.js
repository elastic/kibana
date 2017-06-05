import React from 'react';

import {
  KuiCard,
  KuiCardDescription,
  KuiCardDescriptionTitle,
  KuiCardDescriptionText,
  KuiCardFooter
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
        <a className="kuiButton kuiButton--basic" href="#">
          Banana!
        </a>
      </KuiCardFooter>
    </KuiCard>
  );
};
