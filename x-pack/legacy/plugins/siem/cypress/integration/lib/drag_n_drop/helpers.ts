/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const primaryButton = 0;

/**
 * To overcome the React Beautiful DND sloppy click detection threshold:
 * https://github.com/atlassian/react-beautiful-dnd/blob/67b96c8d04f64af6b63ae1315f74fc02b5db032b/docs/sensors/mouse.md#sloppy-clicks-and-click-prevention-
 */
const dndSloppyClickDetectionThreshold = 5;

/** Starts dragging the subject */
export const drag = (subject: JQuery<HTMLElement>) => {
  const subjectLocation = subject[0].getBoundingClientRect();

  cy.wrap(subject)
    .trigger('mousedown', {
      button: primaryButton,
      clientX: subjectLocation.left,
      clientY: subjectLocation.top,
      force: true,
    })
    .wait(1)
    .trigger('mousemove', {
      button: primaryButton,
      clientX: subjectLocation.left + dndSloppyClickDetectionThreshold,
      clientY: subjectLocation.top,
      force: true,
    })
    .wait(1);
};

/** "Drops" the subject being dragged on the specified drop target  */
export const drop = (dropTarget: JQuery<HTMLElement>) => {
  cy.wrap(dropTarget)
    .trigger('mousemove', { button: primaryButton, force: true })
    .wait(1)
    .trigger('mouseup', { force: true })
    .wait(1);
};

/** Drags the subject being dragged on the specified drop target, but does not drop it  */
export const dragWithoutDrop = (dropTarget: JQuery<HTMLElement>) => {
  cy.wrap(dropTarget).trigger('mousemove', 'center', {
    button: primaryButton,
  });
};
