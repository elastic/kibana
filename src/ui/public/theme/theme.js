const themes = {};
let currentTheme = undefined;

export function registerTheme(theme, styles) {
  themes[theme] = styles;
}

export function applyTheme(newTheme) {
  currentTheme = newTheme;

  const styleNode = document.getElementById('themeCss');

  if (styleNode) {
    const css = themes[currentTheme];

    if (styleNode.styleSheet) {
      styleNode.styleSheet.cssText = css;
    } else {
      styleNode.appendChild(document.createTextNode(css));
    }
  }
}

export function getCurrentTheme() {
  return currentTheme;
}
