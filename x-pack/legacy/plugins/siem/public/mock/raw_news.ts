/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** A raw JSON response from a news feed */
export const rawNewsJSON = `
{
  "items":[
     {
        "title":{
           "en":"Got SIEM Questions?"
        },
        "description":{
           "en":"There's an awesome community of Elastic SIEM users out there. Join the discussion about configuring, learning, and using the Elastic SIEM app, and detecting threats!"
        },
        "link_text":null,
        "link_url":{
           "en":"https://discuss.elastic.co/c/siem?blade=securitysolutionfeed"
        },
        "languages":null,
        "badge":{
           "en":"7.6"
        },
        "image_url":{
           "en":"https://aws1.discourse-cdn.com/elastic/original/3X/f/8/f8c3d0b9971cfcd0be349d973aa5799f71d280cc.png?blade=securitysolutionfeed"
        },
        "publish_on":"2020-01-01T00:00:00",
        "expire_on":"2020-12-31T00:00:00",
        "hash":"5a35c984a9cdc1c6a25913f3d0b99b1aefc7257bc3b936c39db9fa0435edeed0"
     },
     {
        "title":{
           "en":"Elastic Security 7.5.0 released"
        },
        "description":{
           "en":"Elastic Security combines the threat hunting and analytics of Elastic SIEM with the prevention and response provided by Elastic Endpoint Security."
        },
        "link_text":null,
        "link_url":{
           "en":"https://www.elastic.co/blog/elastic-security-7-5-0-released?blade=securitysolutionfeed"
        },
        "languages":null,
        "badge":{
           "en":"7.5"
        },
        "image_url":{
           "en":"https://static-www.elastic.co/v3/assets/bltefdd0b53724fa2ce/blt1caa35177420c61b/5d0d0394d8ff351753cbf2c5/illustrated-screenshot-hero-siem.png?blade=securitysolutionfeed"
        },
        "publish_on":"2019-12-02T00:00:00",
        "expire_on":"2020-12-31T00:00:00",
        "hash":"edcb2d396ffdd80bfd5a97fbc0dc9f4b73477f9be556863fe0a1caf086679420"
     },
     {
        "title":{
           "en":"Elastic Endpoint Security Overview Webinar"
        },
        "description":{
           "en":"At Elastic, we’re bringing endpoint protection and SIEM together into the same experience to streamline how you secure your organization."
        },
        "link_text":null,
        "link_url":{
           "en":"https://www.elastic.co/webinars/elastic-endpoint-security-overview-security-starts-at-the-endpoint?blade=securitysolutionfeed"
        },
        "languages":null,
        "badge":{
           "en":"7.5"
        },
        "image_url":{
           "en":"https://static-www.elastic.co/v3/assets/bltefdd0b53724fa2ce/bltd0eb8689eafe398a/5d970ecc1970e80e85277925/illustration-endpoint-hero.png?blade=securitysolutionfeed"
        },
        "publish_on":"2019-11-17T00:00:00",
        "expire_on":"2020-12-31T00:00:00",
        "hash":"ec970adc85e9eede83f77e4cc6a6fea00cd7822cbe48a71dc2c5f1df10939196"
     },
     {
        "title":{
           "en":"Trying Elastic SIEM at Home?"
        },
        "description":{
           "en":"For small businesses and homes, having access to effective security analytics can come at a high cost of either time or money. Well, until now!"
        },
        "link_text":null,
        "link_url":{
           "en":"https://www.elastic.co/blog/elastic-siem-for-small-business-and-home-1-getting-started?blade=securitysolutionfeed"
        },
        "languages":null,
        "badge":{
           "en":"7.5"
        },
        "image_url":{
           "en":"https://images.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt024c26b7636cb24f/5daf4e293a326d6df6c0e025/home-siem-blog-1-map.jpg?blade=securitysolutionfeed"
        },
        "publish_on":"2019-10-24T00:00:00",
        "expire_on":"2020-12-31T00:00:00",
        "hash":"aa243fd5845356a5ccd54a7a11b208ed307e0d88158873b1fcf7d1164b739bac"
     },
     {
        "title":{
           "en":"Introducing Elastic Endpoint Security"
        },
        "description":{
           "en":"Elastic is excited to announce the introduction of Elastic Endpoint Security, based on Elastic’s acquisition of Endgame, a pioneer and industry-recognized leader in endpoint threat prevention, detection, and response."
        },
        "link_text":null,
        "link_url":{
           "en":"https://www.elastic.co/blog/introducing-elastic-endpoint-security?blade=securitysolutionfeed"
        },
        "languages":null,
        "badge":{
           "en":"7.5"
        },
        "image_url":{
           "en":"https://images.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt1f87637fb7870298/5d9fe27bf8ca980f8717f6f8/screenshot-resolver-trickbot-enrichments-showing-defender-shutdown-endgame-2-optimized.png?blade=securitysolutionfeed"
        },
        "publish_on":"2019-10-15T00:00:00",
        "expire_on":"2020-03-01T00:00:00",
        "hash":"3c64576c9749d33ff98726d641cdf2fb2bfde3dd9a6f99ff2573ac8d8c5b2c02"
     },
     {
        "title":{
           "en":"What is Elastic Common Schema (ECS)?"
        },
        "description":{
           "en":"Elastic SIEM is powered by Elastic Common Schema. With ECS, analytics content such as dashboards, rules, and machine learning jobs can be applied more broadly, searches can be crafted more narrowly, and field names are easier to remember."
        },
        "link_text":null,
        "link_url":{
           "en":"https://www.elastic.co/blog/introducing-the-elastic-common-schema?blade=securitysolutionfeed"
        },
        "languages":null,
        "badge":{
           "en":"7.0"
        },
        "image_url":{
           "en":"https://images.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt71256f06dc672546/5c98d595975fd58f4d12646d/ecs-intro-dashboard-1360.jpg?blade=securitysolutionfeed"
        },
        "publish_on":"2019-02-13T00:00:00",
        "expire_on":"2020-12-31T00:00:00",
        "hash":"b8a0d3d21e9638bde891ab5eb32594b3d7a3daacc7f0900c6dd506d5d7b42410"
     }
  ]
}
`;
