# metricbeat / aws

This guide explains how to set up
* `metricbeat` on a AWS instance to report `system` metrics
* `metricbeat` on your local machine to report `aws` metrics through CloudWatch and the `aws` module

This is helpful to develop and test the following features in the Kibana Infrastructure UI:
* returning cloud metrics from the `metadata` and `metrics` endpoints
* showing cloud metrics on the node detail page
* showing cloud metrics on the inventory overview page (waffle map and list view)

This guide assumes:
* a linux environment, but mac os x should be very similar
* a running `elasticsearch` instance accessible from an AWS instance to send metrics data to (e.g. on Elastic Cloud)
* the knowledge how to configure and run metricbeat to send data to a remote `elasticsearch` instance
* the knowledge how to create and access linux instances on AWS

The information in this guide was valid on July 15 2019.

## Goal

The purpose of this setup is to have data describing an AWS instance coming from two different sources:
- `metricbeat` running on the instance itself, reporting `system` metrics. The documents sent from this machine will contain cloud metadata enabled by the `add_cloud_metadata` flag.
- Cloud metrics provided by AWS CloudWatch, collected by `metricbeat` running on a different node. The documents sent from this machine will contain cloud metadata added by the `aws` module.

![AWS metricbeat setup](../assets/infra_metricbeat_aws.jpg)

To display cloud metrics together with the system metrics collected on the AWS instance itself, we need to match the documents by looking at the cloud metadata added in both cases.

## AWS instance

- Have or create an AWS account, and log in to the AWS management console.
- Navigate to the EC2 service, and create an instance. For everything in this guide, any of the free-tier instances with a plain linux installation will work fine.
- Log into your new AWS instance, install metricbeat, and configure it to send data to your `elasticsearch` installation or cloud deployment. By default only the `system` module will be activated in `metricbeat`, this is fine. Verify that `add_cloud_metadata` is enabled in `metricbeat.yml`.
- Start `metricbeat`
- Login to Kibana and verify in Discover that the documents from your new AWS instance arrive, and include cloud metadata looking like this:
```
"cloud": {
      "instance": {
        "id": "i-011454f72559c510b"
      },
      "machine": {
        "type": "t2.micro"
      },
      "region": "us-east-2",
      "availability_zone": "us-east-2c",
      "provider": "aws"
    }
```

