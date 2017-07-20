import React from 'react';

import {
  Link,
} from 'react-router';

export const NotFoundView = () => (
  <div className="guideContentPage">
    <div className="guideContentPage__content">
      <h1 className="guideTitle">
        Wow, a 404! You just created <em>something</em> from <em>nothing</em>.
      </h1>

      <p className="guideText">
        You visited a page which doesn't exist, causing <em>this</em> page to exist. This page thanks
        you for summoning it into existence from the raw fabric of reality, but it thinks you may
        find another page more interesting. Might it suggest
        the <Link
          className="guideLink"
          to="/"
        >
          home page
        </Link>?
      </p>
    </div>
  </div>
);
