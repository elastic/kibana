import _ from 'lodash';

/**
 * This function is responsible for updating old visStates - the actual saved object
 * object - into the format, that will be required by the current Kibana version.
 * This method will be executed for each saved vis object, that will be loaded.
 * It will return the updated version as Kibana would expect it. It does not modify
 * the passed state.
 */
export const updateOldState = (visState) => {
  if (!visState) return visState;
  const newState = _.cloneDeep(visState);

  if (visState.type === 'gauge' && visState.fontSize) {
    delete newState.fontSize;
    _.set(newState, 'gauge.style.fontSize', visState.fontSize);
  }

  // update old metric to the new one
  if (['gauge', 'metric'].includes(visState.type) && _.get(visState.params, 'gauge.gaugeType', null) === 'Metric') {
    newState.type = 'metric';
    newState.params.addLegend = false;
    newState.params.type = 'metric';
    newState.params.metric = newState.params.gauge;
    delete newState.params.gauge;
    delete newState.params.metric.gaugeType;
    delete newState.params.metric.gaugeStyle;
    delete newState.params.metric.backStyle;
    delete newState.params.metric.scale;
    delete newState.params.metric.type;
    delete newState.params.metric.orientation;
    delete newState.params.metric.verticalSplit;
    delete newState.params.metric.autoExtend;
    newState.params.metric.metricColorMode = newState.params.metric.gaugeColorMode;
    delete newState.params.metric.gaugeColorMode;
  }

  return newState;
};
