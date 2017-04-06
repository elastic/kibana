import colormaps from './colormaps';

const truncatedColorMaps = {};
for (const key in colormaps) {
  if (colormaps.hasOwnProperty(key)) {
    //slice off lightest colors
    truncatedColorMaps[key] = colormaps[key].slice(Math.floor(colormaps[key].length / 4));
  }
}

export default truncatedColorMaps;
