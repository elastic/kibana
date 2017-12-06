const themes = {};

export function registerTheme(theme, cssFiles) {
  themes[theme] = cssFiles;
}

export function applyTheme(newTheme) {
  Object.keys(themes).forEach(theme => themes[theme].forEach(cssFile => cssFile.unuse()));
  themes[newTheme].forEach(cssFile => cssFile.use());
}
