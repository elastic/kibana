const themes = {};
let currentTheme = undefined;

export function registerTheme(theme, styles) {
  themes[theme] = styles;
}

export function applyTheme(newTheme) {
  // Object.keys(themes).forEach(theme => themes[theme].forEach(cssFile => cssFile.unuse()));
  // themes[newTheme].forEach(cssFile => cssFile.use());
  currentTheme = newTheme;
  document.getElementById('themeCss').innerHTML = themes[currentTheme];
}

export function getCurrentTheme() {
  return currentTheme;
}
