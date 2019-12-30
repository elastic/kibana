/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';

import { Annotation } from '../../../common/types/annotations';

/*
  A TypeScript helper type to allow a given component state attribute to be either an annotation or null.
*/
export type AnnotationState = Annotation | null;

/*
  This observable offers a way to share state between components
  that don't have a direct parent -> * -> child relationship.
  It's also useful in mixed angularjs/React environments.

  For example, we want to trigger the flyout for editing annotations from both
  the timeseries_chart and the annotations_table. Since we don't want two flyout instances,
  we cannot simply add the flyout component as a child to each of the other two components.

  The directive/component/DOM structure may look somewhat like this:

                               ->   <TimeseriesChart />
                             /
  <timeseriesexplorer.html>  -->    <AnnotationsTable />
                             \
                               ->   <AnnotationsFlyout />

  In this mixed angular/react environment,
  we want the siblings (chart, table and flyout) to be
  able to communicate with each other.

  The observable can be used as follows to achieve this:

  - To trigger an update, use `annotation$.next(<Annotation>)`
  - To reset the currently editable annotation, use `annotation$.next(null)`

  There are two ways to deal with updates of the observable:

  1. Inline subscription in an existing component.
     This requires the component to be a class component and manage its own state.

  - To react to an update, use `annotation$.subscribe(annotation => { <callback> })`.
  - To add it to a given components state, just use
    `annotation$.subscribe(annotation => this.setState({ annotation }));` in `componentDidMount()`.

  2. useObservable() from 'react-use', offers a way to wrap observables
     into another component which passes on updated values as props.

  - To subscribe to updates this way, wrap your component like:

      const MyOriginalComponent = ({ annotation }) => {
        // don't render if the annotation isn't set
        if (annotation === null) {
          return null;
        }

        return <span>{annotation.annotation}</span>;
      }

      export const MyObservableComponent = (props) => {
        const annotation = useObservable(annotation$);
        return <MyOriginalComponent annotation={annotation} {...props} />;
      };
*/
export const annotation$ = new BehaviorSubject<AnnotationState>(null);

/*
  This observable provides a way to trigger a reload of annotations based on a given event.
  Instead of passing around callbacks or deeply nested props, it can be imported for both
  angularjs controllers/directives and React components.
*/
export const annotationsRefresh$ = new BehaviorSubject(false);
