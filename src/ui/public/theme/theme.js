const themes = {};
let currentTheme = undefined;

export function registerTheme(theme, styles) {
  themes[theme] = styles;
}

export function applyTheme(newTheme) {
  currentTheme = newTheme;
  document.getElementById('themeCss').innerHTML = themes[currentTheme];
}

export function getCurrentTheme() {
  return currentTheme;
}
