// TODO: this should be moved to vis_update_state
// Currently the migration takes place in Vis when calling setCurrentState.
// It should rather convert the raw saved object before starting to instantiate
// any JavaScript classes from it.
const updateVisualizationConfig = (stateConfig, config) => {
  if (!stateConfig || stateConfig.seriesParams) return;
  if (!['line', 'area', 'histogram'].includes(config.type)) return;

  // update value axis options
  const isUserDefinedYAxis = config.setYExtents;
  const mode = ['stacked', 'overlap'].includes(config.mode) ? 'normal' : config.mode || 'normal';
  config.valueAxes[0].scale = {
    ...config.valueAxes[0].scale,
    type: config.scale || 'linear',
    setYExtents: config.setYExtents || false,
    defaultYExtents: config.defaultYExtents || false,
    min: isUserDefinedYAxis ? config.yAxis.min : undefined,
    max: isUserDefinedYAxis ? config.yAxis.max : undefined,
    mode: mode
  };

  // update series options
  const interpolate = config.smoothLines ? 'cardinal' : config.interpolate;
  const stacked = ['stacked', 'percentage', 'wiggle', 'silhouette'].includes(config.mode);
  config.seriesParams[0] = {
    ...config.seriesParams[0],
    type: config.type || 'line',
    mode: stacked ? 'stacked' : 'normal',
    interpolate: interpolate,
    drawLinesBetweenPoints: config.drawLinesBetweenPoints,
    showCircles: config.showCircles,
    radiusRatio: config.radiusRatio
  };
};

export { updateVisualizationConfig };
