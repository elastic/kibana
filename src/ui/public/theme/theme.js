const themes = {};
let currentTheme = undefined;

export function registerTheme(theme, styles) {
  themes[theme] = styles;
}

export function applyTheme(newTheme) {
  currentTheme = newTheme;

  // NOTE: The use of innerHTML opens up to XSS attacks, so we can't support user-generated themes
  // as long as this implementation is in use. Ideally we would use the webpack style-loader/useable
  // to activate and deactivate themes, but that causes the optimize step to fail.
  document.getElementById('themeCss').innerHTML = themes[currentTheme];
}

export function getCurrentTheme() {
  return currentTheme;
}
