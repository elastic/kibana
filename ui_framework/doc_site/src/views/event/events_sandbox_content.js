import React from 'react';

import {
  KuiEvent,
  KuiEventSymbol,
  KuiEventBody,
  KuiEventBodyMessage,
  KuiEventBodyMetadata,
  KuiMenu,
  KuiMenuItem,
} from '../../../../components';

export default () => (
  <div className="kuiView">
    {/* Constrained width, centered content */}
    <div className="kuiViewContent kuiViewContent--constrainedWidth">
      <div className="kuiViewContentItem">

        <div className="kuiHeaderBar">
          <div className="kuiHeaderBarSection">
            <h2 className="kuiSubTitle">
              Cluster of Almonds
            </h2>
          </div>

          <div className="kuiHeaderBarSection">
            <div className="kuiText">
              <a className="kuiLink" href="#">View all 21 almonds</a>
            </div>
          </div>
        </div>

        <KuiMenu className="kuiVerticalRhythm">
          <KuiMenuItem>
            <KuiEvent>
              <KuiEventSymbol>
                <span className="kuiIcon kuiIcon--info fa-info"></span>
              </KuiEventSymbol>

              <KuiEventBody>
                <KuiEventBodyMessage>
                  margarine_masher_toad sitting of 1 is less than opossum of 2
                </KuiEventBodyMessage>

                <KuiEventBodyMetadata>
                  August 4, 2021 02:23:28
                </KuiEventBodyMetadata>
              </KuiEventBody>
            </KuiEvent>
          </KuiMenuItem>

          <KuiMenuItem>
            <KuiEvent>
              <KuiEventSymbol>
                <span className="kuiIcon kuiIcon--error fa-warning"></span>
              </KuiEventSymbol>

              <KuiEventBody>
                <KuiEventBodyMessage>
                  Cluster stork is red because 17 pillory stars are unenamored
                </KuiEventBodyMessage>

                <KuiEventBodyMetadata>
                  August 3, 2021 12:00:54
                </KuiEventBodyMetadata>
              </KuiEventBody>
            </KuiEvent>
          </KuiMenuItem>

          <KuiMenuItem>
            <KuiEvent>
              <KuiEventSymbol>
                <span className="kuiIcon kuiIcon--warning fa-bolt"></span>
              </KuiEventSymbol>

              <KuiEventBody>
                <KuiEventBodyMessage>
                  Elastic band nematode vision marshmallow directed: 50,100
                </KuiEventBodyMessage>

                <KuiEventBodyMetadata>
                  July 27, 2021 11:20:09
                </KuiEventBodyMetadata>
              </KuiEventBody>
            </KuiEvent>
          </KuiMenuItem>
        </KuiMenu>
      </div>
    </div>
  </div>
);
