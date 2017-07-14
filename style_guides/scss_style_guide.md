
# SCSS Style Guide

## Original style guide

Our style guide is an extension of [Sass Guidelines by Hugo Giraudel](https://sass-guidelin.es/). The rules we especially focus on are:

* [Syntax & formatting](https://sass-guidelin.es/#syntax--formatting) (exceptions below)
* [Naming conventions](https://sass-guidelin.es/#naming-conventions) (see the [CSS Style Guide](css_style_guide.md) for infomation on exceptions)
* [Variables](https://sass-guidelin.es/#variables)
* [Mixins](https://sass-guidelin.es/#mixins)

## Syntax and formatting

The Sass Guidelines site recommends using RBG and HSL values to format colors, but we're using
hex values.

## Dealing with extends

You should try never to use the extends functionality in sass. The one exception is when you are extending placeholders to help control maintainabilty. This generally means that extend usage should only be pulling from `global_styles` scope.
