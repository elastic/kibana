# Kibana banners plugin

Allow to add a header banner that will be displayed on every page of the Kibana application

## Configuration

The plugin's configuration prefix is `xpack.banners`

The options are

- `placement`

The placement of the banner. The allowed values are:

- `disabled` - The banner will be disabled
- `top` - The banner will be displayed in the header

- `textContent`

The text content that will be displayed inside the banner, either plain text or markdown

- `textColor`

The color of the banner's text. Must be a valid hex color

- `linkColor`

The color of the banner's link's text. Must be a valid hex color

- `backgroundColor`

The color for the banner's background. Must be a valid hex color

### Configuration example

`kibana.yml`

```yaml
xpack.banners:
  placement: 'top'
  textContent: 'Production environment - Proceed with **special levels** of caution'
  textColor: '#FF0000'
  linkColor: '#0B64DD'
  backgroundColor: '#CC2211'
```
