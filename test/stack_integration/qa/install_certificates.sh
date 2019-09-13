#!/bin/bash

# https://github.com/elastic/elasticsearch/issues/30307
# https://github.com/elastic/support-dev-help-elasticsearch/issues/633
# xpack.notification.email.account.test_account.smtp.ssl.trust=
# https://github.com/elastic/elasticsearch/issues/30307


if [ -z "$PACKAGE" ]; then . ./envvars.sh; fi

echo -e "\n-- `date` Add our certificate so beats dashboards can auth to Kibana"
case $VMOS in
ubuntu)

  echo QUIT | openssl s_client -connect smtp.mailgun.org:587 -starttls smtp > mailgun.pem &
  sleep 4
  cat mailgun.pem
  openssl x509 -in mailgun.pem -inform pem -out mailgun.der -outform der
  keytool -v -printcert -file mailgun.der
  CERTSDIR=`find /usr/lib/ -name cacerts`
  keytool -importcert -alias startsslmailgun -keystore $CERTSDIR -storepass changeit -file mailgun.der -noprompt
  # sed -n '10,34p' mailgun.ca > /usr/local/share/ca-certificates/mailgun.crt
  # cat /usr/local/share/ca-certificates/mailgun.crt
  cp mailgun.pem /usr/local/share/ca-certificates/

  cp $QADIR/../certs/mailgun/mailgun.crt /usr/local/share/ca-certificates/
  cp $QADIR/../certs/ca/ca.crt /usr/local/share/ca-certificates/
  cp $QADIR/../certs/elasticsearch/elasticsearch.crt /usr/local/share/ca-certificates/
  cp $QADIR/../certs/kibana/kibana.crt /usr/local/share/ca-certificates/
  update-ca-certificates

  echo "net.ipv6.conf.all.disable_ipv6 = 1" >> /etc/sysctl.conf
  echo "net.ipv6.conf.default.disable_ipv6 = 1" >> /etc/sysctl.conf
  echo "net.ipv6.conf.lo.disable_ipv6 = 1" >> /etc/sysctl.conf
  sysctl -p
  cat /proc/sys/net/ipv6/conf/all/disable_ipv6
  ;;
centos)
  # echo QUIT | openssl s_client -connect smtp.mailgun.org:587 -starttls smtp > mailgun.pem &
  # sleep 4
  # cat mailgun.pem
  # openssl x509 -in mailgun.pem -inform pem -out mailgun.der -outform der
  # keytool -v -printcert -file mailgun.der
  # echo "JAVA_HOME=$JAVA_HOME"
  # JAVA_HOME=/etc/alternatives/java_sdk
  # keytool -importcert -alias startsslmailgun -keystore $JAVA_HOME/jre/lib/security/cacerts -storepass changeit -file mailgun.der -noprompt
  # do we need sudo here?
  # sudo yum install -y ca-certificates

  set -x
  sudo keytool -importcert -file /vagrant/certs/mailgun/mailgun.crt -alias mailgun -keystore /etc/alternatives/java_sdk/jre/lib/security/cacerts -storepass changeit --noprompt
  sudo keytool -list -keystore /etc/alternatives/java_sdk/jre/lib/security/cacerts -storepass changeit | grep mailgun

  # keytool -importcert -file /vagrant/certs/mailgun/mailgun.crt -alias mailgun -keystore /etc/pki/ca-trust/extracted/java/cacerts -storepass changeit --noprompt
  # cp mailgun.pem /etc/pki/ca-trust/source/anchors/
  cp $QADIR/../certs/mailgun/mailgun.crt /etc/pki/ca-trust/source/anchors/
  cp $QADIR/../certs/ca/ca.crt /etc/pki/ca-trust/source/anchors/
  cp $QADIR/../certs/elasticsearch/elasticsearch.crt /etc/pki/ca-trust/source/anchors/
  cp $QADIR/../certs/kibana/kibana.crt /etc/pki/ca-trust/source/anchors/
  sudo keytool -list -keystore /etc/alternatives/java_sdk/jre/lib/security/cacerts -storepass changeit | grep mailgun
  # sudo update-ca-trust force-enable
  # sudo keytool -list -keystore /etc/alternatives/java_sdk/jre/lib/security/cacerts -storepass changeit | grep mailgun
  # sudo update-ca-trust extract
  # sudo keytool -list -keystore /etc/alternatives/java_sdk/jre/lib/security/cacerts -storepass changeit | grep mailgun

  # this does not seem to have helped at all
  # keytool -import -noprompt -trustcacerts -alias mailgun -file  /vagrant/certs/mailgun/mailgun.crt -keystore "$JAVA_HOME/jre/lib/security/cacerts" -storepass changeit
  # Certificate was added to keystore

  ;;
windows)
  certutil -addstore root $QADIR/../certs/ca/ca.crt
esac
sleep 10
