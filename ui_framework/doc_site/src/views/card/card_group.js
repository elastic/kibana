import React from 'react';

import {
  KuiCardGroupContainer,
  KuiCardGroup,
  KuiCard,
  KuiCardDescription,
  KuiCardDescriptionTitle,
  KuiCardDescriptionText,
  KuiCardFooter
} from '../../../../components';

export default () => {
  const cardStyle = {
    width: '400px'
  };

  return (
    <div>
      <KuiCardGroupContainer>
        <KuiCardGroup>
          <KuiCard className="kuiCardGroup__card" style={cardStyle}>
            <KuiCardDescription className="kuiCardGroup__cardDescription">
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

          <KuiCard className="kuiCardGroup__card" style={cardStyle}>
            <KuiCardDescription className="kuiCardGroup__cardDescription">
              <KuiCardDescriptionTitle>
                Get a pteradactyl
              </KuiCardDescriptionTitle>

              <KuiCardDescriptionText>
                Pteradactyls can fly, like to squawk all the time, and are difficult to spell correctly.
              </KuiCardDescriptionText>
            </KuiCardDescription>

            <KuiCardFooter>
              <a
                className="kuiButton kuiButton--primary"
                href="https://www.elastic.co/subscriptions/xpack"
                target="_blank"
              >
                Pteradactyl!
              </a>
            </KuiCardFooter>
          </KuiCard>
        </KuiCardGroup>
      </KuiCardGroupContainer>

      <br className="guideBreak"/>

      <KuiCardGroup united>
        <KuiCard className="kuiCardGroup__card">
          <KuiCardDescription className="kuiCardGroup__cardDescription">
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

        <KuiCard className="kuiCardGroup__card">
          <KuiCardDescription className="kuiCardGroup__cardDescription">
            <KuiCardDescriptionTitle>
              Get a pteradactyl
            </KuiCardDescriptionTitle>

            <KuiCardDescriptionText>
              Pteradactyls can fly, like to squawk all the time, and are difficult to spell correctly.
            </KuiCardDescriptionText>
          </KuiCardDescription>

          <KuiCardFooter>
            <a
              className="kuiButton kuiButton--primary"
              href="https://www.elastic.co/subscriptions/xpack"
              target="_blank"
            >
              Pteradactyl!
            </a>
          </KuiCardFooter>
        </KuiCard>
      </KuiCardGroup>
    </div>
  );
};
