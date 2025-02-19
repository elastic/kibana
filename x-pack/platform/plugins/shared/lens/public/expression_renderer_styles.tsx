import { UseEuiTheme, useEuiScrollBar } from "@elastic/eui"
import { css } from "@emotion/react"


export const lnsExpressionRendererStyle = (euiThemeContext : UseEuiTheme) => {
  return css`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  overflow: auto;
  // important for visualizations with no padding
  border-radius: ${euiThemeContext.euiTheme.border.radius.medium};
  ${useEuiScrollBar()};
`}
