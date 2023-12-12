# images for actions

Customers would like to have an image attached to notifications from
alerts.  Here are assumptions / constraints:

- the image should be a graph of the same data the alert is processing,
  showing the last few times the alert ran, and associated values

- images will not be persisted to Kibana, because of the size

- images will not be remotely available via Kibana URL, as this would
  require authorization which is unlikely to work write when using
  notification clients like GMail and Slack, which requests
  images serverside

- initial notification targets are email and Slack

- initial rule type targetting index threshold, which is simple and
  has some API around preview charting we can reuse

- images could be SVG, if supported by client (I think gmail will work,
  unclear on Slack) - it looks like Slack does not support SVG well at all.

- otherwise, images should be raw image data, using a `data:` url; Slack
  does not support these, but supports uploading an image file, marking it
  "public", and then referring to it: 
  https://stackoverflow.com/questions/58186399/how-to-create-a-slack-message-containing-an-uploaded-image

- I was thinking we could read previous values for the chart from the
  alerts indices, but they only have data when the rule is alerting;
  we'll need to store it with the rule / rule task state!

- We won't even neccessarily have old run data with the old values, if
  they aren't alertable.  Ideally, we shouldn't be persisting any non-alertable
  data, but this is a case we need to.  The stack alerting rules use a function
  to return data to build the preview chart, which I think will have to be
  good enough for now.  
  
  x-pack/plugins/triggers_actions_ui/server/data/lib/time_series_query.ts  

- We'll arrange to optionally generate that data in the alert, and 
  add it to the action context as a JSON blob.

- In the action itself, we'll have a special way of indicating "add
  the image here".  Maybe a mustache lambda?  It wouldn't really be
  functional, more of a marker.  When found, we'd use the data passed
  in for the chart to a library to build a Vega-lite chart from, and
  then turn that into a PNG (requires cairo support, so will eat RAM).

- For slack, we'll have to upload that image, mark it "public", then
  we can get the link for it and reference it in the Slack blockit 
  message.  

- For email - not sure - I think in theory we could add the image inline
  as a data url, perhaps in SVG format.  Perhaps I should trial-baloon
  that one first!


## extending slack to support block kit

Made a quick hack to the slack api connector - if the first character
starts with `[` or `{`, we treat the text as JSON "blocks".  Here's an
example to use in an action:

```
[
  { 
    "type": "section",
    "text": {
        "type": "mrkdwn",
        "text": "hallo from blockkit!"
    }
  }
]

[
  { 
    "type": "section",
    "text": {
        "type": "mrkdwn",
        "text": "hallo from blockkit!"
    }
  },
  {
    "type": "image",
    "alt_text": "image from Kibana",
    "image_url": "data:image/png;base64"
  }
]
```


