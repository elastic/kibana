let activeTheme;
const themes = {};

export function registerTheme(theme, cssFiles) {
  themes[theme] = cssFiles;

  if (!activeTheme) {
    applyTheme(theme);
  }
}

export function applyTheme(newTheme) {
  if (activeTheme) {
    themes[activeTheme].forEach(cssFile => cssFile.unuse());
  }

  activeTheme = newTheme;
  themes[activeTheme].forEach(cssFile => cssFile.use());
}

export function getTheme() {
  return activeTheme;
}
