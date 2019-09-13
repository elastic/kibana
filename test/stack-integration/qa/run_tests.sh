#!/bin/bash
cd /vagrant

npm install
sudo npm install -g grunt

echo "Logstash logs syslog, but also logs INTO syslog!  Let's stop the logstash service now"
sudo service logstash stop

xvfb-run npm run test:ui:runner
