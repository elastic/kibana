/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { landmarkPoint, shapesAt } from './geometry';

import {
  compositeComponent,
  invert,
  matrixToAngle,
  multiply,
  mvMultiply,
  normalize,
  ORIGIN,
  reduceTransforms,
  rotateZ,
  scale,
  translate,
  translateComponent,
} from './matrix';

import {
  componentProduct as componentProduct2d,
  multiply as multiply2d,
  mvMultiply as mvMultiply2d,
  translate as translate2d,
  UNITMATRIX as UNITMATRIX2D,
} from './matrix2d';

import {
  arrayToMap,
  disjunctiveUnion,
  flatten,
  identity,
  mean,
  not,
  removeDuplicates,
} from './functional';

import { getId as rawGetId } from './../../lib/get_id';

const idMap = {};
const getId = (name, extension) => {
  // ensures that `axisAlignedBoundingBoxShape` is pure-ish - a new call with the same input will not yield a new id
  // (while it's possible for the same group to have the same members - ungroup then make the same group again -
  // it's okay if the newly arising group gets the same id)
  const key = name + '|' + extension;
  return idMap[key] || (idMap[key] = rawGetId(name));
};

const resizeVertexTuples = [
  [-1, -1, 315],
  [1, -1, 45],
  [1, 1, 135],
  [-1, 1, 225], // corners
  [0, -1, 0],
  [1, 0, 90],
  [0, 1, 180],
  [-1, 0, 270], // edge midpoints
];

const connectorVertices = [
  [[-1, -1], [0, -1]],
  [[0, -1], [1, -1]],
  [[1, -1], [1, 0]],
  [[1, 0], [1, 1]],
  [[1, 1], [0, 1]],
  [[0, 1], [-1, 1]],
  [[-1, 1], [-1, 0]],
  [[-1, 0], [-1, -1]],
];

const resizeMultiplierHorizontal = { left: -1, center: 0, right: 1 };
const resizeMultiplierVertical = { top: -1, center: 0, bottom: 1 };

const xNames = { '-1': 'left', '0': 'center', '1': 'right' };
const yNames = { '-1': 'top', '0': 'center', '1': 'bottom' };

const bidirectionalCursors = {
  '0': 'ns-resize',
  '45': 'nesw-resize',
  '90': 'ew-resize',
  '135': 'nwse-resize',
  '180': 'ns-resize',
  '225': 'nesw-resize',
  '270': 'ew-resize',
  '315': 'nwse-resize',
};

// returns the currently dragged shape, or a falsey value otherwise
export const draggingShape = ({ draggedShape, shapes }, hoveredShape, down, mouseDowned) => {
  const dragInProgress =
    down &&
    shapes.reduce((prev, next) => prev || (draggedShape && next.id === draggedShape.id), false);
  const result = (dragInProgress && draggedShape) || (down && mouseDowned && hoveredShape);
  return result;
};

// the currently dragged shape is considered in-focus; if no dragging is going on, then the hovered shape
export const getFocusedShape = (draggedShape, hoveredShape) => draggedShape || hoveredShape; // focusedShapes has updated position etc. information while focusedShape may have stale position

export const getAlterSnapGesture = metaHeld => (metaHeld ? ['relax'] : []);

const initialTransformTuple = {
  deltaX: 0,
  deltaY: 0,
  transform: null,
  cumulativeTransform: null,
};

export const getMouseTransformGesturePrev = ({ mouseTransformState }) =>
  mouseTransformState || initialTransformTuple;

export const getMouseTransformState = (prev, dragging, { x0, y0, x1, y1 }) => {
  if (dragging && !isNaN(x0) && !isNaN(y0) && !isNaN(x1) && !isNaN(y1)) {
    const deltaX = x1 - x0;
    const deltaY = y1 - y0;
    const transform = translate(deltaX - prev.deltaX, deltaY - prev.deltaY, 0);
    const cumulativeTransform = translate(deltaX, deltaY, 0);
    return {
      deltaX,
      deltaY,
      transform,
      cumulativeTransform,
    };
  } else {
    return initialTransformTuple;
  }
};

export const getMouseTransformGesture = tuple =>
  [tuple]
    .filter(tpl => tpl.transform)
    .map(({ transform, cumulativeTransform }) => ({ transform, cumulativeTransform }));

export const getLocalTransformMatrix = shapes => shape => {
  if (!shape.parent) {
    return shape.transformMatrix;
  }
  return multiply(
    invert(shapes.find(s => s.id === shape.parent).transformMatrix),
    shape.transformMatrix
  );
};

export const getSelectedShapeObjects = (scene, shapes) =>
  (scene.selectedShapes || []).map(s => shapes.find(ss => ss.id === s));

const contentShape = allShapes => shape =>
  shape.type === 'annotation'
    ? contentShape(allShapes)(allShapes.find(s => s.id === shape.parent))
    : shape;

const getContentShapes = (allShapes, shapes) => {
  // fixme no need to export, why doesn't linter or highlighter complain?
  const idMap = arrayToMap(allShapes.map(shape => shape.id));
  return shapes.filter(shape => idMap[shape.id]).map(contentShape(allShapes));
};

const primaryShape = shape => (shape.type === 'annotation' ? shape.parent : shape.id);

const rotationManipulation = config => ({
  shape,
  directShape,
  cursorPosition: { x, y },
  alterSnapGesture,
}) => {
  // rotate around a Z-parallel line going through the shape center (ie. around the center)
  if (!shape || !directShape) {
    return { transforms: [], shapes: [] };
  }
  const center = shape.transformMatrix;
  const centerPosition = mvMultiply(center, ORIGIN);
  const vector = mvMultiply(multiply(center, directShape.localTransformMatrix), ORIGIN);
  const oldAngle = Math.atan2(centerPosition[1] - vector[1], centerPosition[0] - vector[0]);
  const newAngle = Math.atan2(centerPosition[1] - y, centerPosition[0] - x);
  const closest45deg = (Math.round(newAngle / (Math.PI / 12)) * Math.PI) / 12;
  const radius = Math.sqrt(Math.pow(centerPosition[0] - x, 2) + Math.pow(centerPosition[1] - y, 2));
  const closest45degPosition = [Math.cos(closest45deg) * radius, Math.sin(closest45deg) * radius];
  const pixelDifference = Math.sqrt(
    Math.pow(closest45degPosition[0] - (centerPosition[0] - x), 2) +
      Math.pow(closest45degPosition[1] - (centerPosition[1] - y), 2)
  );
  const relaxed = alterSnapGesture.indexOf('relax') !== -1;
  const newSnappedAngle =
    pixelDifference < config.rotateSnapInPixels && !relaxed ? closest45deg : newAngle;
  const result = rotateZ(oldAngle - newSnappedAngle);
  return { transforms: [result], shapes: [shape.id] };
};

const minimumSize = (min, { a, b, baseAB }, vector) => {
  // don't allow an element size of less than the minimumElementSize
  // todo switch to matrix algebra
  return [
    Math.max(baseAB ? min - baseAB[0] : min - a, vector[0]),
    Math.max(baseAB ? min - baseAB[1] : min - b, vector[1]),
  ];
};

const centeredResizeManipulation = config => ({ gesture, shape, directShape }) => {
  const transform = gesture.cumulativeTransform;
  // scaling such that the center remains in place (ie. the other side of the shape can grow/shrink)
  if (!shape || !directShape) {
    return { transforms: [], shapes: [] };
  }
  // transform the incoming `transform` so that resizing is aligned with shape orientation
  const vector = mvMultiply(
    multiply(
      invert(compositeComponent(shape.localTransformMatrix)), // rid the translate component
      transform
    ),
    ORIGIN
  );
  const orientationMask = [
    resizeMultiplierHorizontal[directShape.horizontalPosition],
    resizeMultiplierVertical[directShape.verticalPosition],
    0,
  ];
  const orientedVector = componentProduct2d(vector, orientationMask);
  const cappedOrientedVector = minimumSize(config.minimumElementSize, shape, orientedVector);
  return {
    cumulativeTransforms: [],
    cumulativeSizes: [gesture.sizes || translate2d(...cappedOrientedVector)],
    shapes: [shape.id],
  };
};

const asymmetricResizeManipulation = config => ({ gesture, shape, directShape }) => {
  const transform = gesture.cumulativeTransform;
  // scaling such that the center remains in place (ie. the other side of the shape can grow/shrink)
  if (!shape || !directShape) {
    return { transforms: [], shapes: [] };
  }
  // transform the incoming `transform` so that resizing is aligned with shape orientation
  const composite = compositeComponent(shape.localTransformMatrix);
  const inv = invert(composite); // rid the translate component
  const vector = mvMultiply(multiply(inv, transform), ORIGIN);
  const orientationMask = [
    resizeMultiplierHorizontal[directShape.horizontalPosition] / 2,
    resizeMultiplierVertical[directShape.verticalPosition] / 2,
    0,
  ];
  const orientedVector = componentProduct2d(vector, orientationMask);
  const cappedOrientedVector = minimumSize(config.minimumElementSize, shape, orientedVector);

  const antiRotatedVector = mvMultiply(
    multiply(
      composite,
      scale(
        resizeMultiplierHorizontal[directShape.horizontalPosition],
        resizeMultiplierVertical[directShape.verticalPosition],
        1
      ),
      translate(cappedOrientedVector[0], cappedOrientedVector[1], 0)
    ),
    ORIGIN
  );
  const sizeMatrix = gesture.sizes || translate2d(...cappedOrientedVector);
  return {
    cumulativeTransforms: [translate(antiRotatedVector[0], antiRotatedVector[1], 0)],
    cumulativeSizes: [sizeMatrix],
    shapes: [shape.id],
  };
};

const directShapeTranslateManipulation = (cumulativeTransforms, directShapes) => {
  const shapes = directShapes
    .map(shape => shape.type !== 'annotation' && shape.id)
    .filter(identity);
  return [{ cumulativeTransforms, shapes }];
};

const rotationAnnotationManipulation = (
  config,
  directTransforms,
  directShapes,
  allShapes,
  cursorPosition,
  alterSnapGesture
) => {
  const shapeIds = directShapes.map(
    shape =>
      shape.type === 'annotation' && shape.subtype === config.rotationHandleName && shape.parent
  );
  const shapes = shapeIds.map(id => id && allShapes.find(shape => shape.id === id));
  const tuples = flatten(
    shapes.map((shape, i) =>
      directTransforms.map(transform => ({
        transform,
        shape,
        directShape: directShapes[i],
        cursorPosition,
        alterSnapGesture,
      }))
    )
  );
  return tuples.map(rotationManipulation(config));
};

const resizeAnnotationManipulation = (
  config,
  transformGestures,
  directShapes,
  allShapes,
  manipulator
) => {
  const shapeIds = directShapes.map(
    shape =>
      shape.type === 'annotation' && shape.subtype === config.resizeHandleName && shape.parent
  );
  const shapes = shapeIds.map(id => id && allShapes.find(shape => shape.id === id));
  const tuples = flatten(
    shapes.map((shape, i) =>
      transformGestures.map(gesture => ({ gesture, shape, directShape: directShapes[i] }))
    )
  );
  return tuples.map(manipulator);
};

const fromScreen = currentTransform => transform => {
  const isTranslate = transform[12] !== 0 || transform[13] !== 0;
  if (isTranslate) {
    const composite = compositeComponent(currentTransform);
    const inverse = invert(composite);
    const result = translateComponent(multiply(inverse, transform));
    return result;
  } else {
    return transform;
  }
};

const shapeApplyLocalTransforms = intents => shape => {
  const transformIntents = flatten(
    intents
      .map(
        intent =>
          intent.transforms &&
          intent.transforms.length &&
          intent.shapes.find(id => id === shape.id) &&
          intent.transforms.map(fromScreen(shape.localTransformMatrix))
      )
      .filter(identity)
  );
  const sizeIntents = flatten(
    intents
      .map(
        intent =>
          intent.sizes &&
          intent.sizes.length &&
          intent.shapes.find(id => id === shape.id) &&
          intent.sizes
      )
      .filter(identity)
  );
  const cumulativeTransformIntents = flatten(
    intents
      .map(
        intent =>
          intent.cumulativeTransforms &&
          intent.cumulativeTransforms.length &&
          intent.shapes.find(id => id === shape.id) &&
          intent.cumulativeTransforms.map(fromScreen(shape.localTransformMatrix))
      )
      .filter(identity)
  );
  const cumulativeSizeIntents = flatten(
    intents
      .map(
        intent =>
          intent.cumulativeSizes &&
          intent.cumulativeSizes.length &&
          intent.shapes.find(id => id === shape.id) &&
          intent.cumulativeSizes
      )
      .filter(identity)
  );

  const baselineLocalTransformMatrix = multiply(
    shape.baselineLocalTransformMatrix || shape.localTransformMatrix,
    ...transformIntents
  );
  const cumulativeTransformIntentMatrix = multiply(...cumulativeTransformIntents);
  const baselineSizeMatrix = multiply2d(...sizeIntents) || UNITMATRIX2D;
  const localTransformMatrix = cumulativeTransformIntents.length
    ? multiply(baselineLocalTransformMatrix, cumulativeTransformIntentMatrix)
    : baselineLocalTransformMatrix;

  const cumulativeSizeIntentMatrix = multiply2d(...cumulativeSizeIntents);
  const sizeVector = mvMultiply2d(
    cumulativeSizeIntents.length
      ? multiply2d(baselineSizeMatrix, cumulativeSizeIntentMatrix)
      : baselineSizeMatrix,
    shape.baseAB ? [...shape.baseAB, 1] : [shape.a, shape.b, 1]
  );

  // Absorb changes if the gesture has ended
  const absorbChanges =
    !transformIntents.length &&
    !sizeIntents.length &&
    !cumulativeTransformIntents.length &&
    !cumulativeSizeIntents.length;

  return {
    // update the preexisting shape:
    ...shape,
    // apply transforms:
    baselineLocalTransformMatrix: absorbChanges ? null : baselineLocalTransformMatrix,
    baselineSizeMatrix: absorbChanges ? null : baselineSizeMatrix,
    localTransformMatrix: absorbChanges ? shape.localTransformMatrix : localTransformMatrix,
    a: absorbChanges ? shape.a : sizeVector[0],
    b: absorbChanges ? shape.b : sizeVector[1],
    baseAB: absorbChanges ? null : shape.baseAB || [shape.a, shape.b],
  };
};

export const applyLocalTransforms = (shapes, transformIntents) => {
  return shapes.map(shapeApplyLocalTransforms(transformIntents));
};

// eslint-disable-next-line
const getUpstreamTransforms = (shapes, shape) =>
  shape.parent
    ? getUpstreamTransforms(shapes, shapes.find(s => s.id === shape.parent)).concat([
        shape.localTransformMatrix,
      ])
    : [shape.localTransformMatrix];

const getUpstreams = (shapes, shape) =>
  shape.parent
    ? getUpstreams(shapes, shapes.find(s => s.id === shape.parent)).concat([shape])
    : [shape];

const snappedA = shape => shape.a + (shape.snapResizeVector ? shape.snapResizeVector[0] : 0);
const snappedB = shape => shape.b + (shape.snapResizeVector ? shape.snapResizeVector[1] : 0);

const cascadeUnsnappedTransforms = (shapes, shape) => {
  if (!shape.parent) {
    return shape.localTransformMatrix;
  } // boost for common case of toplevel shape
  const upstreams = getUpstreams(shapes, shape);
  const upstreamTransforms = upstreams.map(s => {
    return s.localTransformMatrix;
  });
  const cascadedTransforms = reduceTransforms(upstreamTransforms);
  return cascadedTransforms;
};

const cascadeTransforms = (shapes, shape) => {
  const cascade = s =>
    s.snapDeltaMatrix
      ? multiply(s.localTransformMatrix, s.snapDeltaMatrix)
      : s.localTransformMatrix;
  if (!shape.parent) {
    return cascade(shape);
  } // boost for common case of toplevel shape
  const upstreams = getUpstreams(shapes, shape);
  const upstreamTransforms = upstreams.map(cascade);
  const cascadedTransforms = reduceTransforms(upstreamTransforms);
  return cascadedTransforms;
};

const shapeCascadeProperties = shapes => shape => {
  return {
    ...shape,
    transformMatrix: cascadeTransforms(shapes, shape),
    width: 2 * snappedA(shape),
    height: 2 * snappedB(shape),
  };
};

export const cascadeProperties = shapes => shapes.map(shapeCascadeProperties(shapes));

const alignmentGuides = (config, shapes, guidedShapes, draggedShape) => {
  const result = {};
  let counter = 0;
  const extremeHorizontal = resizeMultiplierHorizontal[draggedShape.horizontalPosition];
  const extremeVertical = resizeMultiplierVertical[draggedShape.verticalPosition];
  // todo replace for loops with [].map calls; DRY it up, break out parts; several of which to move to geometry.js
  // todo switch to informative variable names
  for (const d of guidedShapes) {
    if (d.type === 'annotation') {
      continue;
    } // fixme avoid this by not letting annotations get in here
    // key points of the dragged shape bounding box
    const a = config.pageWidth / 2 + 1;
    const b = config.pageHeight / 2 + 1;
    const pageBordersAndCenterLines = [
      { a, b, localTransformMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, a - 1, b - 1, 0, 1] },
    ];
    for (const referenceShape of shapes.concat(pageBordersAndCenterLines)) {
      if (referenceShape.type === 'annotation') {
        continue;
      } // fixme avoid this by not letting annotations get in here
      if (!config.intraGroupManipulation && referenceShape.parent) {
        continue;
      } // for now, don't snap to grouped elements fixme could snap, but make sure transform is gloabl
      if (
        config.intraGroupSnapOnly &&
        d.parent !== referenceShape.parent &&
        d.parent !== referenceShape.id /* allow parent */
      ) {
        continue;
      }
      const s =
        d.id === referenceShape.id
          ? {
              ...d,
              localTransformMatrix: d.baselineLocalTransformMatrix || d.localTransformMatrix,
              a: d.baseAB ? d.baseAB[0] : d.a,
              b: d.baseAB ? d.baseAB[1] : d.b,
            }
          : referenceShape;
      // key points of the stationary shape
      for (let k = -1; k < 2; k++) {
        for (let l = -1; l < 2; l++) {
          if ((k && !l) || (!k && l)) {
            continue;
          } // don't worry about midpoints of the edges, only the center
          if (
            draggedShape.subtype === config.resizeHandleName &&
            !(
              (extremeHorizontal === k && extremeVertical === l) || // moved corner
              // moved midpoint on horizontal border
              (extremeHorizontal === 0 && k !== 0 && extremeVertical === l) ||
              // moved midpoint on vertical border
              (extremeVertical === 0 && l !== 0 && extremeHorizontal === k)
            )
          ) {
            continue;
          }
          const D = landmarkPoint(d.a, d.b, cascadeUnsnappedTransforms(shapes, d), k, l);
          for (let m = -1; m < 2; m++) {
            for (let n = -1; n < 2; n++) {
              if ((m && !n) || (!m && n)) {
                continue;
              } // don't worry about midpoints of the edges, only the center
              const S = landmarkPoint(s.a, s.b, cascadeUnsnappedTransforms(shapes, s), m, n);
              for (let dim = 0; dim < 2; dim++) {
                const orthogonalDimension = 1 - dim;
                const dd = D[dim];
                const ss = S[dim];
                const key = k + '|' + l + '|' + dim;
                const signedDistance = dd - ss;
                const distance = Math.abs(signedDistance);
                const currentClosest = result[key];
                if (
                  Math.round(distance) <= config.guideDistance &&
                  (!currentClosest || distance <= currentClosest.distance)
                ) {
                  const orthogonalValues = [
                    D[orthogonalDimension],
                    S[orthogonalDimension],
                    ...(currentClosest ? [currentClosest.lowPoint, currentClosest.highPoint] : []),
                  ];
                  const lowPoint = Math.min(...orthogonalValues);
                  const highPoint = Math.max(...orthogonalValues);
                  const midPoint = (lowPoint + highPoint) / 2;
                  const radius = midPoint - lowPoint;
                  result[key] = {
                    id: counter++,
                    localTransformMatrix: translate(
                      dim ? midPoint : ss,
                      dim ? ss : midPoint,
                      config.atopZ
                    ),
                    a: dim ? radius : 0.5,
                    b: dim ? 0.5 : radius,
                    lowPoint,
                    highPoint,
                    distance,
                    signedDistance,
                    dimension: dim ? 'vertical' : 'horizontal',
                    constrained: d.id,
                    constrainer: s.id,
                  };
                }
              }
            }
          }
        }
      }
    }
  }
  return Object.values(result);
};

const isHorizontal = constraint => constraint.dimension === 'horizontal';
const isVertical = constraint => constraint.dimension === 'vertical';

const closestConstraint = (prev = { distance: Infinity }, next) =>
  next.distance < prev.distance ? { constraint: next, distance: next.distance } : prev;

const directionalConstraint = (constraints, filterFun) => {
  const directionalConstraints = constraints.filter(filterFun);
  const closest = directionalConstraints.reduce(closestConstraint, undefined);
  return closest && closest.constraint;
};

const rotationAnnotation = (config, shapes, selectedShapes, shape, i) => {
  const foundShape = shapes.find(s => shape.id === s.id);
  if (!foundShape) {
    return false;
  }

  if (foundShape.type === 'annotation') {
    return rotationAnnotation(
      config,
      shapes,
      selectedShapes,
      shapes.find(s => foundShape.parent === s.id),
      i
    );
  }
  const b = snappedB(foundShape);
  const centerTop = translate(0, -b, 0);
  const pixelOffset = translate(0, -config.rotateAnnotationOffset, config.atopZ);
  const transform = multiply(centerTop, pixelOffset);
  return {
    id: config.rotationHandleName + '_' + i,
    type: 'annotation',
    subtype: config.rotationHandleName,
    interactive: true,
    parent: foundShape.id,
    localTransformMatrix: transform,
    a: config.rotationHandleSize,
    b: config.rotationHandleSize,
  };
};

export const getRotationTooltipAnnotation = (config, proper, shape, intents, cursorPosition) =>
  shape && shape.subtype === config.rotationHandleName
    ? [
        {
          id: config.rotationTooltipName + '_' + proper.id,
          type: 'annotation',
          subtype: config.rotationTooltipName,
          interactive: false,
          parent: null,
          localTransformMatrix: translate(cursorPosition.x, cursorPosition.y, config.tooltipZ),
          a: 0,
          b: 0,
          text: String(Math.round((matrixToAngle(proper.transformMatrix) / Math.PI) * 180)),
        },
      ]
    : [];

const resizePointAnnotations = (config, parent, a, b) => ([x, y, cursorAngle]) => {
  const markerPlace = translate(x * a, y * b, config.resizeAnnotationOffsetZ);
  const pixelOffset = translate(
    -x * config.resizeAnnotationOffset,
    -y * config.resizeAnnotationOffset,
    config.atopZ + 10
  );
  const transform = multiply(markerPlace, pixelOffset);
  const xName = xNames[x];
  const yName = yNames[y];
  return {
    id: [config.resizeHandleName, xName, yName, parent].join('_'),
    type: 'annotation',
    subtype: config.resizeHandleName,
    horizontalPosition: xName,
    verticalPosition: yName,
    cursorAngle,
    interactive: true,
    parent: parent.id,
    localTransformMatrix: transform,
    backgroundColor: 'rgb(0,255,0,1)',
    a: config.resizeAnnotationSize,
    b: config.resizeAnnotationSize,
  };
};

const resizeEdgeAnnotations = (config, parent, a, b) => ([[x0, y0], [x1, y1]]) => {
  const x = a * mean(x0, x1);
  const y = b * mean(y0, y1);
  const markerPlace = translate(x, y, config.atopZ - 10);
  const transform = markerPlace; // no offset etc. at the moment
  const horizontal = y0 === y1;
  const length = horizontal ? a * Math.abs(x1 - x0) : b * Math.abs(y1 - y0);
  const sectionHalfLength = Math.max(0, length / 2 - config.resizeAnnotationConnectorOffset);
  const width = 0.5;
  return {
    id: [config.resizeConnectorName, xNames[x0], yNames[y0], xNames[x1], yNames[y1], parent].join(
      '_'
    ),
    type: 'annotation',
    subtype: config.resizeConnectorName,
    interactive: true,
    parent: parent.id,
    localTransformMatrix: transform,
    backgroundColor: config.devColor,
    a: horizontal ? sectionHalfLength : width,
    b: horizontal ? width : sectionHalfLength,
  };
};

const groupedShape = properShape => shape => shape.parent === properShape.id;
const magic = (config, shape, shapes) => {
  const epsilon = config.rotationEpsilon;
  const integralOf = Math.PI * 2;
  const isIntegerMultiple = s => {
    const zRotation = matrixToAngle(s.localTransformMatrix);
    const ratio = zRotation / integralOf;
    return Math.abs(Math.round(ratio) - ratio) < epsilon;
  };

  function recurse(s) {
    return shapes.filter(groupedShape(s)).every(resizableChild);
  }

  function resizableChild(s) {
    return isIntegerMultiple(s) && recurse(s);
  }

  return recurse(shape);
};

function resizeAnnotation(config, shapes, selectedShapes, shape) {
  const foundShape = shapes.find(s => shape.id === s.id);
  const properShape =
    foundShape &&
    (foundShape.subtype === config.resizeHandleName
      ? shapes.find(s => shape.parent === s.id)
      : foundShape);
  if (!foundShape) {
    return [];
  }

  if (foundShape.subtype === config.resizeHandleName) {
    // preserve any interactive annotation when handling
    const result = foundShape.interactive
      ? resizeAnnotationsFunction(config, {
          shapes,
          selectedShapes: [shapes.find(s => shape.parent === s.id)],
        })
      : [];
    return result;
  }
  if (foundShape.type === 'annotation') {
    return resizeAnnotation(
      config,
      shapes,
      selectedShapes,
      shapes.find(s => foundShape.parent === s.id)
    );
  }

  // fixme left active: snap wobble. right active: opposite side wobble.
  const a = snappedA(properShape);
  const b = snappedB(properShape);
  const allowResize =
    properShape.type !== 'group' ||
    (config.groupResize && magic(config, properShape, shapes.filter(s => s.type !== 'annotation')));
  const resizeVertices = allowResize ? resizeVertexTuples : [];
  const resizePoints = resizeVertices.map(resizePointAnnotations(config, shape, a, b));
  const connectors = connectorVertices.map(resizeEdgeAnnotations(config, shape, a, b));
  return [...resizePoints, ...connectors];
}

export function resizeAnnotationsFunction(config, { shapes, selectedShapes }) {
  const shapesToAnnotate = selectedShapes;
  return flatten(
    shapesToAnnotate
      .map(shape => {
        return resizeAnnotation(config, shapes, selectedShapes, shape);
      })
      .filter(identity)
  );
}

const crystallizeConstraint = shape => {
  const result = { ...shape };
  if (shape.snapDeltaMatrix) {
    result.localTransformMatrix = multiply(shape.localTransformMatrix, shape.snapDeltaMatrix);
    result.snapDeltaMatrix = null;
  }
  if (shape.snapResizeVector) {
    result.a = snappedA(shape);
    result.b = snappedB(shape);
    result.snapResizeVector = null;
  }
  return result;
};

const translateShapeSnap = (horizontalConstraint, verticalConstraint, draggedElement) => shape => {
  const constrainedX = horizontalConstraint && horizontalConstraint.constrained === shape.id;
  const constrainedY = verticalConstraint && verticalConstraint.constrained === shape.id;
  const snapOffsetX = constrainedX ? -horizontalConstraint.signedDistance : 0;
  const snapOffsetY = constrainedY ? -verticalConstraint.signedDistance : 0;
  if (constrainedX || constrainedY) {
    if (!snapOffsetX && !snapOffsetY) {
      return shape;
    }
    const snapOffset = translateComponent(
      multiply(
        rotateZ(matrixToAngle(draggedElement.localTransformMatrix)),
        translate(snapOffsetX, snapOffsetY, 0)
      )
    );
    return {
      ...shape,
      snapDeltaMatrix: snapOffset,
    };
  } else if (shape.snapDeltaMatrix || shape.snapResizeVector) {
    return crystallizeConstraint(shape);
  } else {
    return shape;
  }
};

const resizeShapeSnap = (
  horizontalConstraint,
  verticalConstraint,
  draggedElement,
  symmetric,
  horizontalPosition,
  verticalPosition
) => shape => {
  const constrainedShape = draggedElement && shape.id === draggedElement.id;
  const constrainedX = horizontalConstraint && horizontalConstraint.constrained === shape.id;
  const constrainedY = verticalConstraint && verticalConstraint.constrained === shape.id;
  const snapOffsetX = constrainedX ? horizontalConstraint.signedDistance : 0;
  const snapOffsetY = constrainedY ? -verticalConstraint.signedDistance : 0;
  if (constrainedX || constrainedY) {
    const multiplier = symmetric ? 1 : 0.5;
    const angle = matrixToAngle(draggedElement.localTransformMatrix);
    const horizontalSign = -resizeMultiplierHorizontal[horizontalPosition]; // fixme unify sign
    const verticalSign = resizeMultiplierVertical[verticalPosition];
    // todo turn it into matrix algebra via matrix2d.js
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const snapOffsetA = horizontalSign * (cos * snapOffsetX - sin * snapOffsetY);
    const snapOffsetB = verticalSign * (sin * snapOffsetX + cos * snapOffsetY);
    const snapTranslateOffset = translateComponent(
      multiply(
        rotateZ(angle),
        translate((1 - multiplier) * -snapOffsetX, (1 - multiplier) * snapOffsetY, 0)
      )
    );
    const snapSizeOffset = [multiplier * snapOffsetA, multiplier * snapOffsetB];
    return {
      ...shape,
      snapDeltaMatrix: snapTranslateOffset,
      snapResizeVector: snapSizeOffset,
    };
  } else if (constrainedShape) {
    return {
      ...shape,
      snapDeltaMatrix: null,
      snapResizeVector: null,
    };
  } else {
    return crystallizeConstraint(shape);
  }
};

const extend = ([[xMin, yMin], [xMax, yMax]], [x0, y0], [x1, y1]) => [
  [Math.min(xMin, x0, x1), Math.min(yMin, y0, y1)],
  [Math.max(xMax, x0, x1), Math.max(yMax, y0, y1)],
];

const cornerVertices = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

const getAABB = shapes =>
  shapes.reduce(
    (prevOuter, shape) => {
      const shapeBounds = cornerVertices.reduce((prevInner, xyVertex) => {
        const cornerPoint = normalize(
          mvMultiply(shape.transformMatrix, [shape.a * xyVertex[0], shape.b * xyVertex[1], 0, 1])
        );
        return extend(prevInner, cornerPoint, cornerPoint);
      }, prevOuter);
      return extend(prevOuter, ...shapeBounds);
    },
    [[Infinity, Infinity], [-Infinity, -Infinity]]
  );

const projectAABB = ([[xMin, yMin], [xMax, yMax]]) => {
  const a = (xMax - xMin) / 2;
  const b = (yMax - yMin) / 2;
  const xTranslate = xMin + a;
  const yTranslate = yMin + b;
  const zTranslate = 0; // todo fix hack that ensures that grouped elements continue to be selectable
  const localTransformMatrix = translate(xTranslate, yTranslate, zTranslate);
  const rigTransform = translate(-xTranslate, -yTranslate, -zTranslate);
  return { a, b, localTransformMatrix, rigTransform };
};

const dissolveGroups = (groupsToDissolve, shapes, selectedShapes) => {
  return {
    shapes: shapes
      .filter(s => !groupsToDissolve.find(g => s.id === g.id))
      .map(shape => {
        const preexistingGroupParent = groupsToDissolve.find(
          groupShape => groupShape.id === shape.parent
        );
        // if linked, dissociate from group parent
        return preexistingGroupParent
          ? {
              ...shape,
              parent: null,
              localTransformMatrix: multiply(
                // pulling preexistingGroupParent from `shapes` to get fresh matrices
                shapes.find(s => s.id === preexistingGroupParent.id).localTransformMatrix, // reinstate the group offset onto the child
                shape.localTransformMatrix
              ),
            }
          : shape;
      }),
    selectedShapes: selectedShapes.filter(s => !groupsToDissolve.find(g => g.id === s.id)),
  };
};

const hasNoParentWithin = shapes => shape => !shapes.some(g => shape.parent === g.id);

const asYetUngroupedShapes = (preexistingAdHocGroups, selectedShapes) =>
  selectedShapes.filter(hasNoParentWithin(preexistingAdHocGroups));

const idMatch = shape => s => s.id === shape.id;

const idsMatch = selectedShapes => shape => selectedShapes.find(idMatch(shape));

const axisAlignedBoundingBoxShape = (config, shapesToBox) => {
  const axisAlignedBoundingBox = getAABB(shapesToBox);
  const { a, b, localTransformMatrix, rigTransform } = projectAABB(axisAlignedBoundingBox);
  const id = getId(config.groupName, shapesToBox.map(s => s.id).join('|'));
  const aabbShape = {
    id,
    type: config.groupName,
    subtype: config.adHocGroupName,
    a,
    b,
    localTransformMatrix,
    rigTransform,
    parent: null,
  };
  return aabbShape;
};

const resetChild = s => {
  if (s.childBaseAB) {
    s.childBaseAB = null;
    s.baseLocalTransformMatrix = null;
  }
};

const childScaler = ({ a, b }, baseAB) => {
  // a scaler of 0, encountered when element is shrunk to zero size, would result in a non-invertible transform matrix
  const epsilon = 1e-6;
  const groupScaleX = Math.max(a / baseAB[0], epsilon);
  const groupScaleY = Math.max(b / baseAB[1], epsilon);
  const groupScale = scale(groupScaleX, groupScaleY, 1);
  return groupScale;
};

const resizeChild = groupScale => s => {
  const childBaseAB = s.childBaseAB || [s.a, s.b];
  const impliedScale = scale(...childBaseAB, 1);
  const inverseImpliedScale = invert(impliedScale);
  const baseLocalTransformMatrix = s.baseLocalTransformMatrix || s.localTransformMatrix;
  const normalizedBaseLocalTransformMatrix = multiply(baseLocalTransformMatrix, impliedScale);
  const T = multiply(groupScale, normalizedBaseLocalTransformMatrix);
  const backScaler = groupScale.map(d => Math.abs(d));
  const inverseBackScaler = invert(backScaler);
  const abTuple = mvMultiply(multiply(backScaler, impliedScale), [1, 1, 1, 1]);
  s.localTransformMatrix = multiply(T, multiply(inverseImpliedScale, inverseBackScaler));
  s.a = abTuple[0];
  s.b = abTuple[1];
  s.childBaseAB = childBaseAB;
  s.baseLocalTransformMatrix = baseLocalTransformMatrix;
};

const resizeGroup = (shapes, rootElement) => {
  const idMap = {};
  for (const shape of shapes) {
    idMap[shape.id] = shape;
  }

  const depths = {};
  const ancestorsLength = shape => (shape.parent ? ancestorsLength(idMap[shape.parent]) + 1 : 0);
  for (const shape of shapes) {
    depths[shape.id] = ancestorsLength(shape);
  }

  const resizedParents = { [rootElement.id]: rootElement };
  const sortedShapes = shapes.slice().sort((a, b) => depths[a.id] - depths[b.id]);
  const parentResized = s => Boolean(s.childBaseAB || s.baseAB);
  for (const shape of sortedShapes) {
    const parent = resizedParents[shape.parent];
    if (parent) {
      resizedParents[shape.id] = shape;
      if (parentResized(parent)) {
        resizeChild(childScaler(parent, parent.childBaseAB || parent.baseAB))(shape);
      } else {
        resetChild(shape);
      }
    }
  }
  return sortedShapes;
};

const getLeafs = (descendCondition, allShapes, shapes) =>
  removeDuplicates(
    s => s.id,
    flatten(
      shapes.map(shape =>
        descendCondition(shape) ? allShapes.filter(s => s.parent === shape.id) : shape
      )
    )
  );

const preserveCurrentGroups = (shapes, selectedShapes) => ({ shapes, selectedShapes });

export const getConfiguration = scene => scene.configuration;

export const getShapes = scene => scene.shapes;

export const getHoveredShapes = (config, shapes, cursorPosition) =>
  shapesAt(
    shapes.filter(
      // second AND term excludes intra-group element hover (and therefore drag & drop), todo: remove this current limitation
      s =>
        (s.type !== 'annotation' || s.interactive) &&
        (config.intraGroupManipulation || !s.parent || s.type === 'annotation')
    ),
    cursorPosition
  );

export const getHoveredShape = hoveredShapes => (hoveredShapes.length ? hoveredShapes[0] : null);

const singleSelect = (prev, config, hoveredShapes, metaHeld, uid) => {
  // cycle from top ie. from zero after the cursor position changed ie. !sameLocation
  const down = true; // this function won't be called otherwise
  const depthIndex =
    config.depthSelect &&
    metaHeld &&
    (!hoveredShapes.length || hoveredShapes[0].type !== 'annotation')
      ? (prev.depthIndex + (down && !prev.down ? 1 : 0)) % hoveredShapes.length
      : 0;
  return {
    shapes: hoveredShapes.length ? [hoveredShapes[depthIndex]] : [],
    uid,
    depthIndex: hoveredShapes.length ? depthIndex : 0,
    down,
  };
};

const multiSelect = (prev, config, hoveredShapes, metaHeld, uid, selectedShapeObjects) => {
  const shapes =
    hoveredShapes.length > 0
      ? disjunctiveUnion(shape => shape.id, selectedShapeObjects, hoveredShapes.slice(0, 1)) // ie. depthIndex of 0, if any
      : [];
  return {
    shapes,
    uid,
    depthIndex: 0,
    down: false,
  };
};

export const getGroupingTuple = (config, shapes, selectedShapes) => {
  const childOfGroup = shape => shape.parent && shape.parent.startsWith(config.groupName);
  const isAdHocGroup = shape =>
    shape.type === config.groupName && shape.subtype === config.adHocGroupName;
  const preexistingAdHocGroups = shapes.filter(isAdHocGroup);
  const matcher = idsMatch(selectedShapes);
  const selectedFn = shape => matcher(shape) && shape.type !== 'annotation';
  const freshSelectedShapes = shapes.filter(selectedFn);
  const freshNonSelectedShapes = shapes.filter(not(selectedFn));
  const isGroup = shape => shape.type === config.groupName;
  const isOrBelongsToGroup = shape => isGroup(shape) || childOfGroup(shape);
  const someSelectedShapesAreGrouped = selectedShapes.some(isOrBelongsToGroup);
  const selectionOutsideGroup = !someSelectedShapesAreGrouped;
  return {
    selectionOutsideGroup,
    freshSelectedShapes,
    freshNonSelectedShapes,
    preexistingAdHocGroups,
  };
};

export const getGrouping = (config, shapes, selectedShapes, groupAction, tuple) => {
  const {
    selectionOutsideGroup,
    freshSelectedShapes,
    freshNonSelectedShapes,
    preexistingAdHocGroups,
  } = tuple;
  if (groupAction === 'group') {
    const selectedAdHocGroupsToPersist = selectedShapes.filter(
      s => s.subtype === config.adHocGroupName
    );
    return {
      shapes: shapes.map(s =>
        s.subtype === config.adHocGroupName ? { ...s, subtype: config.persistentGroupName } : s
      ),
      selectedShapes: selectedShapes
        .filter(selected => selected.subtype !== config.adHocGroupName)
        .concat(
          selectedAdHocGroupsToPersist.map(shape => ({
            ...shape,
            subtype: config.persistentGroupName,
          }))
        ),
    };
  }

  if (groupAction === 'ungroup') {
    return dissolveGroups(
      selectedShapes.filter(s => s.subtype === config.persistentGroupName),
      shapes,
      asYetUngroupedShapes(preexistingAdHocGroups, freshSelectedShapes)
    );
  }

  // ad hoc groups must dissolve if 1. the user clicks away, 2. has a selection that's not the group, or 3. selected something else
  if (preexistingAdHocGroups.length && selectionOutsideGroup) {
    // asYetUngroupedShapes will trivially be the empty set if case 1 is realized: user clicks aside -> selectedShapes === []
    // return preserveCurrentGroups(shapes, selectedShapes);
    return dissolveGroups(
      preexistingAdHocGroups,
      shapes,
      asYetUngroupedShapes(preexistingAdHocGroups, freshSelectedShapes)
    );
  }

  // preserve the current selection if the sole ad hoc group is being manipulated
  const elements = getContentShapes(shapes, selectedShapes);
  if (elements.length === 1 && elements[0].type === 'group') {
    return config.groupResize
      ? {
          shapes: [
            ...resizeGroup(shapes.filter(s => s.type !== 'annotation'), elements[0]),
            ...shapes.filter(s => s.type === 'annotation'),
          ],
          selectedShapes,
        }
      : preserveCurrentGroups(shapes, selectedShapes);
  }
  // group items or extend group bounding box (if enabled)
  if (selectedShapes.length < 2) {
    // resize the group if needed (ad-hoc group resize is manipulated)
    return preserveCurrentGroups(shapes, selectedShapes);
  } else {
    // group together the multiple items
    const group = axisAlignedBoundingBoxShape(config, freshSelectedShapes);
    const selectedLeafShapes = getLeafs(
      shape => shape.subtype === config.adHocGroupName,
      shapes,
      freshSelectedShapes
    );
    const parentedSelectedShapes = selectedLeafShapes.map(shape => ({
      ...shape,
      parent: group.id,
      localTransformMatrix: multiply(group.rigTransform, shape.transformMatrix),
    }));
    const nonGroupGraphConstituent = s =>
      s.subtype !== config.adHocGroupName && !parentedSelectedShapes.find(ss => s.id === ss.id);
    const dissociateFromParentIfAny = s =>
      s.parent &&
      s.parent.startsWith(config.groupName) &&
      preexistingAdHocGroups.find(ahg => ahg.id === s.parent)
        ? { ...s, parent: null }
        : s;
    const allTerminalShapes = parentedSelectedShapes.concat(
      freshNonSelectedShapes.filter(nonGroupGraphConstituent).map(dissociateFromParentIfAny)
    );
    return {
      shapes: allTerminalShapes.concat([group]),
      selectedShapes: [group],
    };
  }
};

export const getCursor = (config, shape, draggedPrimaryShape) => {
  if (!shape) {
    return 'auto';
  }
  switch (shape.subtype) {
    case config.rotationHandleName:
      return 'crosshair';
    case config.resizeHandleName:
      const angle = ((matrixToAngle(shape.transformMatrix) * 180) / Math.PI + 360) % 360;
      const screenProjectedAngle = angle + shape.cursorAngle;
      const discretizedAngle = (Math.round(screenProjectedAngle / 45) * 45 + 360) % 360;
      return bidirectionalCursors[discretizedAngle];
    default:
      return draggedPrimaryShape ? 'grabbing' : 'grab';
  }
};

export const getSelectedShapesPrev = scene => scene.selectionState;

export const getSelectionStateFull = (
  prev,
  config,
  selectedShapeObjects,
  hoveredShapes,
  { down, uid },
  metaHeld,
  multiselect
) => {
  const uidUnchanged = uid === prev.uid;
  const mouseButtonUp = !down;
  if (selectedShapeObjects) {
    prev.shapes = selectedShapeObjects.slice();
  }
  // take action on mouse down only, and if the uid changed (except with directSelect), ie. bail otherwise
  if (mouseButtonUp || uidUnchanged) {
    return { ...prev, down, uid, metaHeld };
  }
  const selectFunction = config.singleSelect || !multiselect ? singleSelect : multiSelect;
  return selectFunction(prev, config, hoveredShapes, metaHeld, uid, selectedShapeObjects);
};

export const getSelectedShapes = selectionTuple => selectionTuple.shapes;

export const getSelectionState = ({ uid, depthIndex, down }) => ({ uid, depthIndex, down });

export const getSelectedPrimaryShapeIds = shapes => shapes.map(primaryShape);

export const getResizeManipulator = (config, toggle) =>
  (toggle ? centeredResizeManipulation : asymmetricResizeManipulation)(config);

export const getTransformIntents = (
  config,
  transformGestures,
  directShapes,
  shapes,
  cursorPosition,
  alterSnapGesture,
  manipulator
) => [
  ...directShapeTranslateManipulation(
    transformGestures.map(g => g.cumulativeTransform),
    directShapes
  ),
  ...rotationAnnotationManipulation(
    config,
    transformGestures.map(g => g.transform),
    directShapes,
    shapes,
    cursorPosition,
    alterSnapGesture
  ),
  ...resizeAnnotationManipulation(config, transformGestures, directShapes, shapes, manipulator),
];

export const getDraggedPrimaryShape = (shapes, draggedShape) =>
  draggedShape && shapes.find(shape => shape.id === primaryShape(draggedShape));

export const getAlignmentGuideAnnotations = (config, shapes, draggedPrimaryShape, draggedShape) => {
  const guidedShapes = draggedPrimaryShape
    ? [shapes.find(s => s.id === draggedPrimaryShape.id)].filter(identity)
    : [];
  return guidedShapes.length
    ? alignmentGuides(config, shapes, guidedShapes, draggedShape).map(shape => ({
        ...shape,
        id: config.alignmentGuideName + '_' + shape.id,
        type: 'annotation',
        subtype: config.alignmentGuideName,
        interactive: false,
        backgroundColor: 'magenta',
        parent: null,
      }))
    : [];
};

const borderAnnotation = (subtype, lift) => shape => ({
  ...shape,
  id: subtype + '_' + shape.id,
  type: 'annotation',
  subtype,
  interactive: false,
  localTransformMatrix: multiply(shape.localTransformMatrix, translate(0, 0, lift)),
  parent: shape.parent,
});

export const getAdHocChildrenAnnotations = (config, { shapes }) => {
  const adHocGroups = shapes.filter(s => s.subtype === config.adHocGroupName);
  return shapes
    .filter(s => s.type !== 'annotation' && s.parent && adHocGroups.find(p => p.id === s.parent))
    .map(borderAnnotation(config.getAdHocChildAnnotationName, config.hoverLift));
};

export const getHoverAnnotations = (config, shapes, selectedPrimaryShapeIds, draggedShape) =>
  shapes
    .filter(
      shape =>
        shape &&
        shape.type !== 'annotation' &&
        selectedPrimaryShapeIds.indexOf(shape.id) === -1 &&
        !draggedShape
    )
    .map(borderAnnotation(config.hoverAnnotationName, config.hoverLift));

export const getSnappedShapes = (
  config,
  shapes,
  draggedShape,
  draggedElement,
  alignmentGuideAnnotations,
  alterSnapGesture,
  symmetricManipulation
) => {
  const contentShapes = shapes.filter(shape => shape.type !== 'annotation');
  const subtype = draggedShape && draggedShape.subtype;
  // snapping doesn't come into play if there's no dragging, or it's not a resize drag or translate drag on a
  // leaf element or a group element:
  if (
    subtype &&
    [config.resizeHandleName, config.adHocGroupName, config.persistentGroupName].indexOf(
      subtype
    ) === -1
  ) {
    return contentShapes;
  }
  const constraints = alignmentGuideAnnotations; // fixme split concept of snap constraints and their annotations
  const relaxed = alterSnapGesture.indexOf('relax') !== -1;
  const constrained = config.snapConstraint && !relaxed;
  const horizontalConstraint = constrained && directionalConstraint(constraints, isHorizontal);
  const verticalConstraint = constrained && directionalConstraint(constraints, isVertical);
  const snapper =
    subtype === config.resizeHandleName
      ? resizeShapeSnap(
          horizontalConstraint,
          verticalConstraint,
          draggedElement,
          symmetricManipulation,
          draggedShape.horizontalPosition,
          draggedShape.verticalPosition
        )
      : translateShapeSnap(horizontalConstraint, verticalConstraint, draggedElement); // leaf element or ad-hoc group
  return contentShapes.map(snapper);
};

export const getConstrainedShapesWithPreexistingAnnotations = (snapped, transformed) =>
  snapped.concat(transformed.filter(s => s.type === 'annotation'));

export const getGroupAction = (action, mouseIsDown) => {
  const event = action && action.event;
  return !mouseIsDown && (event === 'group' || event === 'ungroup') ? event : null;
};

export const getGroupedSelectedShapes = ({ selectedShapes }) => selectedShapes;

export const getGroupedSelectedPrimaryShapeIds = selectedShapes => selectedShapes.map(primaryShape);

export const getGroupedSelectedShapeIds = selectedShapes => selectedShapes.map(shape => shape.id);

export const getRotationAnnotations = (config, { shapes, selectedShapes }) => {
  const shapesToAnnotate = selectedShapes;
  return shapesToAnnotate
    .map((shape, i) => rotationAnnotation(config, shapes, selectedShapes, shape, i))
    .filter(identity);
};

export const getAnnotatedShapes = (
  { shapes },
  alignmentGuideAnnotations,
  hoverAnnotations,
  rotationAnnotations,
  resizeAnnotations,
  rotationTooltipAnnotation,
  adHocChildrenAnnotations
) => {
  // fixme update it to a simple concatenator, no need for enlisting the now pretty long subtype list
  const annotations = [].concat(
    alignmentGuideAnnotations,
    hoverAnnotations,
    rotationAnnotations,
    resizeAnnotations,
    rotationTooltipAnnotation,
    adHocChildrenAnnotations
  );
  // remove preexisting annotations
  const contentShapes = shapes.filter(shape => shape.type !== 'annotation');
  return contentShapes.concat(annotations); // add current annotations
}; // collection of shapes themselves

export const getNextScene = (
  configuration,
  hoveredShape,
  selectedShapes,
  selectedPrimaryShapes,
  shapes,
  gestureEnd,
  draggedShape,
  cursor,
  selectionState,
  mouseTransformState,
  gestureState
) => ({
  configuration,
  hoveredShape,
  selectedShapes,
  selectedPrimaryShapes,
  shapes,
  gestureEnd,
  draggedShape,
  cursor,
  selectionState,
  mouseTransformState,
  gestureState,
});

export const updaterFun = (nextScene, primaryUpdate) => ({
  primaryUpdate,
  currentScene: nextScene,
});
