#!/bin/bash
if [ -z "$PACKAGE" ]; then . ./envvars.sh; fi

if [ "${VMOS}" = "ubuntu" ]; then
  # Ubuntu
  java_version=$(java -version 2>&1 | grep version | sed 's|.* version "\(.*\..*\)" .*|\1|')
  ubuntu_version=$(grep VERSION_ID /etc/*-release)
  echo $JAVA_HOME
  rm /etc/profile.d/jdk.sh || echo "no /etc/profile.d/jdk.sh file to remove"
  export JAVA_HOME=''
  # if [[ $java_version < 11 ]]; then
  #   # Hold on - aren't we bundling a JRE now? https://github.com/elastic/elasticsearch/issues/45555
  #   echo -e "\n-- `date` Install Java 11, please wait"
  #   dpkg -i /vagrant/qa/jdk-11.0.4_linux-x64_bin.deb
  #   export JAVA_HOME=/usr/lib/jvm/jdk-11.0.4/
  #   export PATH=/usr/lib/jvm/jdk-11.0.4/bin/:$PATH
  #   sudo rm /etc/alternatives/java
  #   sudo ln -s /usr/lib/jvm/jdk-11.0.4/bin/java /etc/alternatives/java
  #   java -version
  # fi
  if [ "${ESHOST}" = "localhost" ]; then
    while [[ `ps aux | grep -i apt | grep -v grep | wc -l` != 0 ]]; do sleep 1; echo "waiting for previous installs to finish"; done
    echo -e "\n-- `date` install libfontconfig libfreetype6 so Reporting can work on a headless server"
    sudo apt-get -qq install -y  libfontconfig libfreetype6
  fi
fi

if [ "${VMOS}" = "centos" ]; then
  # CentOS or Redhat
  sysctl -w vm.max_map_count=262144

  if [[ `grep CentOS /etc/system-release` =~ "release 6." ]]; then
    echo elasticsearch   soft nproc 4096 >> /etc/security/limits.conf
    echo elasticsearch   hard nproc 4096 >> /etc/security/limits.conf
  fi

  # see https://www.elastic.co/guide/en/elasticsearch/reference/2.1/setup-configuration.html
  yum makecache fast

  yum install -y unzip
  java -version
  which java
  echo $JAVA_HOME
  export JAVA_HOME=''
  # if [[ $java_version < 1.8 ]]; then
  #   if [ "$PLATFORM" = "-x86_64" ]; then
  #     if [ ! -f jdk-8u131-linux-x64.tar.gz ]; then
  #       wget -q --header "Cookie: oraclelicense=accept-securebackup-cookie" "http://download.oracle.com/otn-pub/java/jdk/8u131-b11/d54c1d3a095b4ff2b6607d096fa80163/jdk-8u131-linux-x64.tar.gz"
  #     fi
  #     sudo yum localinstall -y jdk-8u131-linux-x64.rpm
  #   else
  #     wget -q --no-cookies --no-check-certificate --header "Cookie: gpw_e24=http%3A%2F%2Fwww.oracle.com%2F; oraclelicense=accept-securebackup-cookie" "http://download.oracle.com/otn-pub/java/jdk/8u45-b14/jdk-8u45-linux-i586.rpm"
  #     sudo yum localinstall -y jdk-8u45-linux-i586.rpm
  #   fi
  # fi

  # can't access mapped ports unless we do this or something similar
  iptables -F
  # for Reporting, freetype is probably already installed, but just in case.
  set +e
  yum install -y fontconfig freetype
  pushd /usr/share/fonts/
  wget -q https://material-design.storage.googleapis.com/publish/material_v_9/0B0J8hsRkk91LRjU4U1NSeXdjd1U/RobotoTTF.zip
  unzip RobotoTTF.zip
  rm -f RobotoTTF.zip
  popd
  set -e

fi

if [ "${VMOS}" = "suse" ] || [ "${VMOS}" = "sles" ]; then
set -x
  # sysctl -w vm.max_map_count=262144
  # see https://www.elastic.co/guide/en/elasticsearch/reference/2.1/setup-configuration.html
#  zypper makecache fast

  zypper install -y unzip

  java_version=$(java -version 2>&1 | grep version | sed 's|.* version "\(.*\..*\)\..*_.*"|\1|')
  echo -e "\n-- `date` Java version = $java_version"
  if [[ $java_version < 1.8 ]]; then
    echo "ERROR::::: this SUSE virtualbox should already have Java 8"
    exit 1
    if [ "$PLATFORM" = "-x86_64" ]; then
      wget -q --header "Cookie: oraclelicense=accept-securebackup-cookie" "http://download.oracle.com/otn-pub/java/jdk/8u131-b11/d54c1d3a095b4ff2b6607d096fa80163/jdk-8u131-linux-x64.tar.gz"
      sudo zypper install -y jdk-8u131-linux-x64.rpm
    else
      wget -q --no-cookies --no-check-certificate --header "Cookie: gpw_e24=http%3A%2F%2Fwww.oracle.com%2F; oraclelicense=accept-securebackup-cookie" "http://download.oracle.com/otn-pub/java/jdk/8u45-b14/jdk-8u45-linux-i586.rpm"
      sudo zypper localinstall -y jdk-8u45-linux-i586.rpm
    fi
  fi


  # can't access mapped ports unless we do this or something similar
  iptables -F
  # for Reporting, freetype is probably already installed, but just in case.
  zypper install -y fontconfig
  zypper install -y freetype || echo "freetype is not found for SLES-12"
  pushd /usr/share/fonts/
  wget -q https://material-design.storage.googleapis.com/publish/material_v_9/0B0J8hsRkk91LRjU4U1NSeXdjd1U/RobotoTTF.zip
  unzip -u RobotoTTF.zip
  rm -f RobotoTTF.zip
  popd

fi


if [ "${VMOS}" = "debian" ]; then
  curl -O https://download.java.net/java/GA/jdk11/9/GPL/openjdk-11.0.2_linux-x64_bin.tar.gz
  tar zxf openjdk-11.0.2_linux-x64_bin.tar.gz
  mv jdk-11* /usr/local/
  echo export JAVA_HOME=/usr/local/jdk-11.0.2 >> /etc/profile.d/jdk.sh
  echo export PATH=$PATH:$JAVA_HOME/bin >> /etc/profile.d/jdk.sh
  source /etc/profile
  java -version
fi
