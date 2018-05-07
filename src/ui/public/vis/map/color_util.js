export function getLegendColors(colorRamp) {
  const colors = [];
  colors[0] = getColor(colorRamp, 0);
  colors[1] = getColor(colorRamp, Math.floor(colorRamp.length * 1 / 4));
  colors[2] = getColor(colorRamp, Math.floor(colorRamp.length * 2 / 4));
  colors[3] = getColor(colorRamp, Math.floor(colorRamp.length * 3 / 4));
  colors[4] = getColor(colorRamp, colorRamp.length - 1);
  return colors;
}

export function getColor(colorRamp, i) {
  const color = colorRamp[i][1];
  const red = Math.floor(color[0] * 255);
  const green = Math.floor(color[1] * 255);
  const blue = Math.floor(color[2] * 255);
  return `rgb(${red},${green},${blue})`;
}
