# Example Reporting integration!

Use this example code to understand how to add a "Generate Report" button to a
Kibana page. This simple example shows that the end-to-end functionality of
generating a screenshot report of a page just requires you to render a React
component that you import from the Reportinng plugin.

A "reportable" Kibana page is one that has an **alternate version to show the data in a "screenshot-friendly" way**. The alternate version can be reached at a variation of the page's URL that the App team builds.

A "screenshot-friendly" page has **all interactive features turned off**. These are typically notifications, popups, tooltips, controls, autocomplete libraries, etc.

Turning off these features **keeps glitches out of the screenshot**, and makes the server-side headless browser **run faster and use less RAM**.

The URL that Reporting captures is controlled by the application, is a part of
a "jobParams" object that gets passed to the React component imported from
Reporting. The job params give the app control over the end-resulting report:

- Layout
  - Page dimensions
  - DOM attributes to select where the visualization container(s) is/are. The App team must add the attributes to DOM elements in their app.
  - DOM events that the page fires off and signals when the rendering is done. The App team must implement triggering the DOM events around rendering the data in their app.
- Export type definition
  - Processes the jobParams into output data, which is stored in Elasticsearch in the Reporting system index.
  - Export type definitions are registered with the Reporting plugin at setup time.

The existing export type definitions are PDF, PNG, and CSV. They should be
enough for nearly any use case.

If the existing options are too limited for a future use case, the AppServices
team can assist the App team to implement a custom export type definition of
their own, and register it using the Reporting plugin API **(documentation coming soon)**.

---
