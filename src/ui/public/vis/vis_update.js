const updateVisualizationConfig = (stateConfig, config) => {

  if (config.type === 'gauge' && config.fontSize) {
    config.gauge.style.fontSize = config.fontSize;
    delete config.fontSize;
  }

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
  const interpolate = config.smoothLines ? 'cardinal' : config.interpolate || 'linear';
  const stacked = ['stacked', 'percentage', 'wiggle', 'silhouette'].includes(config.mode || 'stacked');
  config.seriesParams[0] = {
    ...config.seriesParams[0],
    type: config.type || config.seriesParams[0].type,
    mode: stacked ? 'stacked' : 'normal',
    interpolate: interpolate,
    drawLinesBetweenPoints: config.drawLinesBetweenPoints || config.seriesParams[0].drawLinesBetweenPoints,
    showCircles: config.showCircles || config.seriesParams[0].showCircles,
    radiusRatio: config.radiusRatio || config.seriesParams[0].radiusRatio
  };
};

export { updateVisualizationConfig };
