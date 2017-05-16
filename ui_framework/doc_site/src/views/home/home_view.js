import React from 'react';

import {
  Link,
} from 'react-router';

export const HomeView = () => (
  <div className="guideContentPage guideHomePage">
    <div className="guideContentPage__hint">
      <p className="guideText guideText--noMargin">
        You can navigate the docs with this little menu button.
      </p>

      <div className="guideHintArrow" />
    </div>

    <div className="guideContentPage__content">
      <h1 className="guideTitle">
        Welcome to the Kibana UI Framework docs!
      </h1>

      <p className="guideText">
        The Kibana team uses the UI Framework to build Kibana's user interface. Please see
        the <a href="https://www.elastic.co/guide/en/kibana/current/index.html" className="guideLink">general Kibana docs</a> for information on how to use Kibana, and
        the <a href="https://www.elastic.co/guide/en/kibana/current/kibana-plugins.html" className="guideLink">plugin-specific section</a> for
        help developing Kibana plugins.
      </p>

      <p className="guideText">
        You can find the source for the UI Framework
        at the <a href="https://github.com/elastic/kibana/tree/master/ui_framework" className="guideLink">Kibana repo</a>.
      </p>

      <p className="guideText">
        If you're just getting started with the UI Framework for the first time, you may
        be interested in some of the more commonly-used components:
      </p>

      <p className="guideText">
        <Link
          className="guideLink"
          to="button"
        >
          <span className="fa fa-angle-double-right" /> Buttons
        </Link>
      </p>

      <p className="guideText">
        <Link
          className="guideLink"
          to="form"
        >
          <span className="fa fa-angle-double-right" /> Form elements
        </Link>
      </p>

      <p className="guideText">
        <Link
          className="guideLink"
          to="table"
        >
          <span className="fa fa-angle-double-right" /> Tables
        </Link>
      </p>

      <p className="guideText">
        <Link
          className="guideLink"
          to="typography"
        >
          <span className="fa fa-angle-double-right" /> Typography
        </Link>
      </p>

      <p className="guideText">
        <Link
          className="guideLink"
          to="infopanel"
        >
          <span className="fa fa-angle-double-right" /> InfoPanels
        </Link>
      </p>
    </div>
  </div>
);
